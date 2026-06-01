"""
Unified ConvoInsight API Server
Consolidates chat analysis, audio transcription, and text normalization services.
"""

import os
import tempfile
from datetime import datetime
from pathlib import Path
import traceback
import logging

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from backend.routes.analysis import router as analysis_router
from backend.routes.auth import router as auth_router
from backend.schemas.analysis import (
    ChatUploadRequest,
    ParsedMessageItem,
    ProcessingStatus,
    SummaryItem,
)
from backend.services.cluster_bridge import shape_clusters
from backend.services.clustering import ClusteringService
from backend.services.intentpipeline import classify_all
from backend.services.pipeline import (
    flatten_summaries_for_legacy,
    run_analysis_pipeline,
)
from backend.services.stt_integration import process_audio_file, load_whisper_model
from backend.services.summarization import SummarizationService
from backend.services.text_normalizer import full_normalize
from dotenv import load_dotenv

load_dotenv()

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── MongoDB Connection ─────────────────────────────────────────────────────────
# Use mongo_enabled flag — never truth-test a PyMongo Database object (if db: …).
db = None
mongo_enabled = False
try:
    from config.mongodb import mongodb
    db = mongodb.connect()
    mongo_enabled = db is not None
    logger.info("✓ MongoDB connection initialized")
except Exception as e:
    logger.warning(f"⚠ MongoDB not available: {e}")
    db = None
    mongo_enabled = False

# ── FastAPI App Setup ──────────────────────────────────────────────────────────
app = FastAPI(
    title="ConvoInsight Engine",
    description="Unified API for chat analysis, audio transcription, and text normalization",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(analysis_router)
app.include_router(auth_router)

# ── Service Singletons (audio / legacy paths) ──────────────────────────────────
clustering_service = ClusteringService()
summarization_service = SummarizationService()

# ── Pydantic Models ────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    message: str
    database: str

class TextNormalizeRequest(BaseModel):
    text: str
    use_ml: bool = True

class TextNormalizeResponse(BaseModel):
    normalized_text: str
    validation: bool = True

class AudioTranscribeResponse(BaseModel):
    raw_transcription: str
    normalized_text: str
    language: str
    source: str
    validation: bool

class ErrorResponse(BaseModel):
    error: str
    detail: str
    status_code: int = 500
    job_id: Optional[str] = None
    traceback: Optional[str] = None

# ── Startup Event ──────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Pre-load Whisper model on startup"""
    logger.info("=" * 80)
    logger.info("🚀 ConvoInsight API Starting...")
    logger.info("=" * 80)
    try:
        load_whisper_model()
        logger.info("✓ Whisper model loaded successfully")
    except Exception as e:
        logger.warning(f"⚠ Warning: Could not pre-load Whisper model: {e}")
        logger.warning("  Audio transcription will load model on first request")

# ── Helper Functions ───────────────────────────────────────────────────────────

def _serialise_messages(messages: list, chat_id: str) -> list:
    """Prepare messages for MongoDB insertion, converting datetime to ISO string."""
    serialised = []
    for msg in messages:
        m = dict(msg)
        m["chatId"] = chat_id
        if isinstance(m.get("timestamp"), datetime):
            m["timestamp"] = m["timestamp"].isoformat()
        serialised.append(m)
    return serialised

# ── Health Check Endpoint ──────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Check server health and database connectivity."""
    db_status = "connected" if mongo_enabled else "offline"
    return {
        "status": "ok",
        "message": "ConvoInsight API is running",
        "database": db_status
    }

@app.get("/health")
async def root_health():
    """Alternative health check endpoint (no /api prefix)."""
    db_status = "connected" if mongo_enabled else "offline"
    return {
        "status": "ok",
        "message": "ConvoInsight API is running",
        "database": db_status
    }

# ── Chat Analysis Endpoints ────────────────────────────────────────────────────

class LegacyChatUploadResponse(BaseModel):
    """Backward-compatible response; includes canonical ``analysis`` block."""

    success: bool
    status: str = "done"
    chatId: Optional[str] = None
    summaries: Optional[List[SummaryItem]] = None
    participants: Optional[List[str]] = None
    messageCount: Optional[int] = None
    messages: Optional[List[ParsedMessageItem]] = None
    summary: Optional[str] = None
    conversation_summary: Optional[dict] = None
    priorities: Optional[dict] = None
    actions: Optional[list] = None
    error: Optional[str] = None


@app.post("/api/chats/upload", response_model=LegacyChatUploadResponse)
async def upload_chat_legacy(request_data: ChatUploadRequest):
    """
    Legacy one-shot upload + analyze (kept for existing mobile client).

    Prefer: POST /api/upload-chat → POST /api/process-chat → GET /api/get-results/{id}
    """
    try:
        if not request_data.rawText.strip():
            return LegacyChatUploadResponse(success=False, status="failed", error="rawText is empty")

        logger.info("Analyzing chat (legacy): %s", request_data.chatName)

        result, meta = run_analysis_pipeline(
            raw_text=request_data.rawText,
            chat_name=request_data.chatName,
            current_user=request_data.currentUser,
        )

        messages_raw = [
            {
                "sender": m.sender,
                "content": m.content,
                "timestamp": m.timestamp,
                "messageType": m.messageType,
                "rawTimestamp": m.rawTimestamp,
            }
            for m in result.messages
        ]

        if mongo_enabled and db is not None:
            chat_doc = {
                "chatName": meta["chatName"],
                "chatType": meta["chatType"],
                "participants": meta["participants"],
                "totalMessages": meta["messageCount"],
                "uploadedAt": datetime.now(),
                "currentUser": request_data.currentUser,
            }
            chat_id = str(db["chats"].insert_one(chat_doc).inserted_id)
            db["messages"].insert_many(_serialise_messages(messages_raw, chat_id))
            db["summaries"].insert_one({
                "chatId": chat_id,
                "summaries": meta.get("sender_summaries"),
                "analysis": result.model_dump(),
                "generatedAt": datetime.now(),
            })
        else:
            chat_id = "local_" + str(datetime.now().timestamp())

        flat = flatten_summaries_for_legacy(meta["sender_summaries"])
        summary_items = [SummaryItem(**item) for item in flat]

        return LegacyChatUploadResponse(
            success=True,
            status=ProcessingStatus.DONE.value,
            chatId=chat_id,
            summaries=summary_items,
            participants=meta["participants"],
            messageCount=meta["messageCount"],
            messages=[ParsedMessageItem(**m.model_dump()) for m in result.messages],
            summary=result.summary,
            conversation_summary=result.conversation_summary.model_dump(),
            priorities=result.priorities.model_dump(),
            actions=[a.model_dump() for a in result.actions],
        )

    except Exception as exc:
        logger.error("Error analyzing chat: %s", exc)
        logger.error(traceback.format_exc())
        return LegacyChatUploadResponse(success=False, status="failed", error=str(exc))


@app.post("/api/chats/upload-audio")
async def upload_audio(
    audio: UploadFile = File(...),
    currentUser: str = Form("Me")
):
    """
    Upload and transcribe audio, then run chat analysis pipeline.
    
    Form fields:
        audio: Audio file (wav, mp3, m4a, ogg, opus, flac, webm, etc.)
        currentUser: Name of current user (optional, default 'Me')
    """
    temp_path = None
    try:
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No audio file provided")

        logger.info(f"🎙️  Processing audio: {audio.filename}")

        # Save to temp file
        suffix = Path(audio.filename).suffix or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            temp_path = tmp.name

        # Transcribe and normalize
        stt_result = process_audio_file(temp_path, normalize=True, use_ml=False)
        logger.info(f"  ✓ Transcribed and normalized")

        # Wrap as single message
        messages = [{
            "sender": "AudioInput",
            "content": stt_result["normalized_text"],
            "timestamp": datetime.now(),
            "messageType": "text",
        }]

        # Run analysis pipeline
        raw_clusters = clustering_service.aggregate_messages(messages, currentUser)
        shaped_clusters = shape_clusters(raw_clusters)
        summaries = summarization_service.summarize_by_sender(shaped_clusters, currentUser)
        summaries = classify_all(summaries)

        logger.info("✓ Audio analysis complete")

        return {
            "success": True,
            "raw_transcription": stt_result["raw_transcription"],
            "normalized_text": stt_result["normalized_text"],
            "language": stt_result["language"],
            "summaries": flatten_summaries_for_legacy(summaries),
        }

    except Exception as exc:
        logger.error(f"❌ Error analyzing audio: {exc}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc))

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.warning(f"⚠ Could not remove temp file: {e}")


@app.get("/api/chats/{chat_id}/summaries")
async def get_summaries(chat_id: str):
    """Retrieve stored summaries for a chat."""
    try:
        if not mongo_enabled or db is None:
            return {"success": False, "error": "Database not available"}

        summary = db["summaries"].find_one({"chatId": chat_id})
        if summary:
            summary["_id"] = str(summary["_id"])
            return {"success": True, "data": summary}
        return {"success": False, "error": "Not found"}, 404

    except Exception as exc:
        logger.error(f"❌ Error retrieving summaries: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/chats")
async def list_chats():
    """List all uploaded chats (metadata only)."""
    try:
        if not mongo_enabled or db is None:
            return {"success": False, "error": "Database not available"}

        chats = list(db["chats"].find({}, {"messages": 0}))
        for chat in chats:
            chat["_id"] = str(chat["_id"])
        return {"success": True, "data": chats}

    except Exception as exc:
        logger.error(f"❌ Error listing chats: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

# ── Text Normalization Endpoint ────────────────────────────────────────────────

@app.post("/normalize/text", response_model=TextNormalizeResponse)
async def normalize_text(request: TextNormalizeRequest):
    """
    Normalize text using rule-based and/or ML normalization.
    
    Args:
        text: Text to normalize
        use_ml: Whether to use ML-based normalization (default: True)
    """
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")

        logger.info(f"📝 Normalizing text (use_ml={request.use_ml})")
        result = full_normalize(request.text, use_ml=request.use_ml)

        return TextNormalizeResponse(
            normalized_text=result["normalized_text"],
            validation=result.get("validation", True)
        )

    except Exception as e:
        logger.error(f"❌ Text normalization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/normalize/text-file", response_model=TextNormalizeResponse)
async def normalize_text_file(
    file: UploadFile = File(..., description="Text file to normalize"),
):
    """
    Upload and normalize a text file.
    
    Args:
        file: Text file (.txt) to normalize
    """
    try:
        if not file.filename.endswith('.txt'):
            raise HTTPException(
                status_code=400,
                detail="Only .txt files are supported"
            )

        content = await file.read()
        text = content.decode('utf-8')

        if not text.strip():
            raise HTTPException(status_code=400, detail="File is empty")

        logger.info(f"📝 Normalizing text file: {file.filename}")
        result = full_normalize(text)

        return TextNormalizeResponse(
            normalized_text=result["normalized_text"],
            validation=result.get("validation", True)
        )

    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File must be UTF-8 encoded text"
        )
    except Exception as e:
        logger.error(f"❌ File processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Audio Transcription Endpoint ───────────────────────────────────────────────

@app.post("/transcribe/audio", response_model=AudioTranscribeResponse)
async def transcribe_audio_file(
    file: UploadFile = File(..., description="Audio file (wav, mp3, m4a, ogg, opus, flac, webm)"),
    language: Optional[str] = Form(None, description="Language code (e.g., 'en'). None for auto-detect")
):
    """
    Transcribe audio file and normalize the text.
    
    Args:
        file: Audio file in supported format
        language: Language code for transcription (optional, auto-detects if not provided)
    """
    temp_path = None
    try:
        valid_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.opus', '.webm']
        file_ext = Path(file.filename).suffix.lower()

        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio format. Supported: {', '.join(valid_extensions)}"
            )

        logger.info(f"🎙️  Processing audio: {file.filename}")

        if not language or language.lower() == "string":
            language = None

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            temp_path = tmp_file.name
            logger.info(f"  ✓ Saved to temp: {temp_path}")

        logger.info("  ⏳ Starting audio processing...")
        result = process_audio_file(
            audio_path=temp_path,
            language=language
        )
        logger.info(f"  ✓ Audio processing complete")

        return AudioTranscribeResponse(
            raw_transcription=result["raw_transcription"],
            normalized_text=result["normalized_text"],
            language=result["language"],
            source=result["normalization_source"],
            validation=result["validation"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Transcription error: {e}")
        logger.error(f"  Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription error: {str(e)}"
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                logger.info(f"  🗑️ Cleaned up temp file")
            except Exception as e:
                logger.warning(f"  ⚠ Could not remove temp file: {e}")

# ── Exception Handlers ─────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error("HTTP %s: %s", exc.status_code, exc.detail)
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        payload = {**exc.detail, "status_code": exc.status_code}
    else:
        payload = {
            "error": "request_failed",
            "detail": str(exc.detail),
            "status_code": exc.status_code,
        }
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc)
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "detail": str(exc),
            "status_code": 500,
        },
    )

# ── Entry Point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 80)
    print("🚀 CONVOINSGHTENGINE - UNIFIED API SERVER v2.0")
    print("=" * 80)
    print("\n📚 API Documentation available at:")
    print("   - Swagger UI: http://localhost:8000/docs")
    print("   - ReDoc: http://localhost:8000/redoc")
    print("\n🔗 Endpoints:")
    print("   Chat Analysis:")
    print("     POST /api/upload-chat               - Upload chat (step 1)")
    print("     POST /api/process-chat              - Run pipeline (step 2)")
    print("     GET  /api/get-results/{id}          - Poll results")
    print("     POST /api/chats/upload              - Legacy one-shot upload")
    print("     POST /api/chats/upload-audio        - Upload and transcribe audio")
    print("     GET  /api/chats                     - List all chats")
    print("     GET  /api/chats/{chat_id}/summaries - Get chat summaries")
    print("   Text Processing:")
    print("     POST /normalize/text                - Normalize text")
    print("     POST /normalize/text-file           - Normalize text file")
    print("   Audio Processing:")
    print("     POST /transcribe/audio              - Transcribe audio file")
    print("   Health:")
    print("     GET  /api/health                    - Health check")
    print("\n" + "=" * 80 + "\n")

    uvicorn.run(
        "backend.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

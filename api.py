
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import tempfile
import os
from pathlib import Path
import traceback
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from stt_integration import (
    transcribe_audio,
    process_audio_file,
    load_whisper_model
)
from text_normalizer import full_normalize

app = FastAPI(
    title="ConvoInsight Engine",
    description="API for transcribing audio files and normalizing text using Whisper STT and rule-based/ML normalization",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextNormalizeRequest(BaseModel):
    text: str
    use_ml: bool = True  

class TextNormalizeResponse(BaseModel):
    normalized_text: str
   

class AudioTranscribeResponse(BaseModel):
    raw_transcription: str
    normalized_text: str
    language: str
    source: str
    validation: bool

class HealthResponse(BaseModel):
    status: str
    message: str

class ErrorResponse(BaseModel):
    error: str
    detail: str
    traceback: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    """Pre-load Whisper model on startup"""
    logger.info(" Starting API server...")
    try:
        load_whisper_model()
        logger.info(" Whisper model loaded successfully")
    except Exception as e:
        logger.error(f" Warning: Could not pre-load Whisper model: {e}")
        logger.error(traceback.format_exc())

@app.post("/normalize/text-file", response_model=TextNormalizeResponse)
async def normalize_text_file(
    file: UploadFile = File(..., description="Text file to normalize"),

):
    """
    Upload and normalize a text file (rules + ML combined)
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
        
        logger.info(f"Normalizing text file: {file.filename}")
        result = full_normalize(text)
        logger.info(f" File normalization successful")
        
        return {
            "normalized_text": result["normalized_text"],
           
        }
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File must be UTF-8 encoded text"
        )
    except Exception as e:
        logger.error(f" File processing error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Processing error: {str(e)}"
        )

@app.post("/transcribe/audio", response_model=AudioTranscribeResponse)
async def transcribe_audio_file(
    file: UploadFile = File(..., description="Audio file (wav, mp3, m4a, ogg, opus, flac, webm, etc.)"),
   
    language: Optional[str] = Form(None, description="Language code (e.g., 'en'). None for auto-detect")
):
    """
    Transcribe audio from any folder and normalize text
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

        logger.info(f" Processing audio file: {file.filename}")

    
        if not language or language.lower() == "string":
            language = "auto"

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            temp_path = tmp_file.name
            logger.info(f" Saved to temp: {temp_path}")

        logger.info(" Starting audio processing...")
        result = process_audio_file(
            audio_path=temp_path,
           
            language=language if language != "auto" else None
        )
        logger.info(f" Audio processing complete")

        return {
            "raw_transcription": result["raw_transcription"],
            "normalized_text": result["normalized_text"],
            "language": result["language"],
            "source": result["normalization_source"],
            "validation": result["validation"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f" Transcription error: {e}")
        logger.error(f" Error traceback:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription error: {str(e)}\n\nCheck server logs for full traceback"
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                logger.info(f"ðŸ—‘ï¸ Cleaned up temp file: {temp_path}")
            except Exception as e:
                logger.warning(f" Could not remove temp file: {e}")

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "traceback": traceback.format_exc(),
            "status_code": 500
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "=" * 80)
    print(" STARTING STT + TEXT NORMALIZER API")
    print("=" * 80)
    print("\n API Documentation available at:")
    print("   - Swagger UI: http://localhost:8000/docs")
    print("   - ReDoc: http://localhost:8000/redoc")
    print("\n" + "=" * 80 + "\n")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
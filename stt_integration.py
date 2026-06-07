"""
Top-level shim for stt_integration used by tests.
Delegates to `backend.services.stt_integration`.
"""
try:
    from backend.services.stt_integration import (
        transcribe_audio,
        process_audio_file,
        load_whisper_model,
    )
except Exception:
    raise

__all__ = ["transcribe_audio", "process_audio_file", "load_whisper_model"]

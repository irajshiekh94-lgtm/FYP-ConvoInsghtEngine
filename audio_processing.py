"""
Top-level shim for audio_processing used by tests.
Delegates to `backend.services.audio_processing`.
"""
try:
    from backend.services.audio_processing import normalize_audio
except Exception:
    # Re-raise with clearer message to aid debugging in test output
    raise

__all__ = ["normalize_audio"]

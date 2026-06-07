"""
Top-level shim for text_normalizer used by tests.
Delegates to `backend.services.text_normalizer`.
"""
try:
    from backend.services.text_normalizer import full_normalize
except Exception:
    raise

__all__ = ["full_normalize"]

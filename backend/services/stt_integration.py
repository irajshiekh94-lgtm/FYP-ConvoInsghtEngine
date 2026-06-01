"""
Speech-to-Text Integration - ConvoInsight
Whisper STT with audio preprocessing and text normalisation.
"""

import os
import tempfile
from typing import Optional

import numpy as np
import sounddevice as sd
import soundfile as sf
import torch
import whisper

from .audio_processing import normalize_audio
from .text_normalizer import full_normalize


# ── Whisper singleton ─────────────────────────────────────────────────────────
_whisper_model = None
WHISPER_MODEL_SIZE = "base"   # swap to "small" or "medium" for better accuracy


def load_whisper_model(model_size: str = WHISPER_MODEL_SIZE) -> whisper.Whisper:
    """Load (or return cached) Whisper model."""
    global _whisper_model
    if _whisper_model is None:
        print(f"[STT] Loading Whisper '{model_size}'...")
        _whisper_model = whisper.load_model(model_size)
        print("[STT] Whisper ready.")
    return _whisper_model


# ── Low-level helpers ─────────────────────────────────────────────────────────

def record_audio(duration: int = 10, sample_rate: int = 16_000) -> np.ndarray:
    """
    Record from the default microphone.

    Args:
        duration   : seconds to record.
        sample_rate: must be 16 000 for Whisper.

    Returns:
        1-D float32 numpy array.
    """
    print(f"[STT] Recording for {duration}s — speak now...")
    audio_data = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="float32",
    )
    sd.wait()
    print("[STT] Recording complete.")
    return audio_data.flatten()


def _save_temp_wav(audio_data: np.ndarray, sample_rate: int = 16_000) -> str:
    """Write a numpy array to a temporary WAV file. Caller must delete it."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    sf.write(tmp.name, audio_data, sample_rate)
    return tmp.name


# ── Core transcription ────────────────────────────────────────────────────────

def transcribe_audio(audio_path: str, language: Optional[str] = None) -> dict:
    """
    Preprocess + transcribe an audio file with Whisper.

    Args:
        audio_path: Path to audio file (any ffmpeg-supported format).
        language  : BCP-47 code ('en', 'ur', …) or None for auto-detect.

    Returns:
        {
            'text'    : str,   # raw transcript
            'language': str,   # detected language code
            'segments': list   # Whisper segment dicts
        }
    """
    model = load_whisper_model()

    # Try preprocessing; fall back to original if it fails
    cleaned_path: Optional[str] = None
    try:
        cleaned_path = normalize_audio(audio_path)
        audio_to_use = cleaned_path
        print(f"[STT] Audio preprocessed → {cleaned_path}")
    except Exception as exc:
        print(f"[STT] Preprocessing skipped ({exc}), using original.")
        audio_to_use = audio_path

    try:
        result = model.transcribe(
            audio_to_use,
            language=language,
            fp16=torch.cuda.is_available(),
        )
    finally:
        # Clean up the preprocessed file whether transcription succeeded or not
        if cleaned_path and cleaned_path != audio_path and os.path.exists(cleaned_path):
            try:
                os.remove(cleaned_path)
            except OSError:
                pass

    transcription = result["text"].strip()
    detected_lang = result.get("language", "unknown")
    print(f"[STT] Transcription done (lang={detected_lang}).")

    return {
        "text": transcription,
        "language": detected_lang,
        "segments": result.get("segments", []),
    }


def transcribe_from_mic(duration: int = 10, language: Optional[str] = None) -> dict:
    """Record from microphone and return transcription dict."""
    audio_data = record_audio(duration)
    tmp_path = _save_temp_wav(audio_data)
    try:
        return transcribe_audio(tmp_path, language)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ── Full pipeline ─────────────────────────────────────────────────────────────

def process_audio_file(
    audio_path: str,
    normalize: bool = True,
    use_ml: bool = False,
    language: Optional[str] = None,
) -> dict:
    """
    Full pipeline: audio file → preprocessing → STT → text normalisation.

    Args:
        audio_path: Path to audio file.
        normalize : Run text_normalizer on the transcript.
        use_ml    : Pass to full_normalize (ML polish via FLAN-T5).
                    Default False — avoids truncation on long transcripts.
        language  : Whisper language hint.

    Returns:
        {
            'raw_transcription'   : str,
            'normalized_text'     : str,
            'language'            : str,
            'normalization_source': str,
            'validation'          : bool
        }
    """
    stt = transcribe_audio(audio_path, language)
    raw = stt["text"]

    if normalize and raw.strip():
        norm = full_normalize(raw, use_ml=use_ml)
        return {
            "raw_transcription": raw,
            "normalized_text": norm["normalized_text"],
            "language": stt["language"],
            "normalization_source": norm["source"],
            "validation": norm["validation"],
        }

    return {
        "raw_transcription": raw,
        "normalized_text": raw,
        "language": stt["language"],
        "normalization_source": "none",
        "validation": True,
    }


def process_microphone(
    duration: int = 10,
    normalize: bool = True,
    use_ml: bool = False,
    language: Optional[str] = None,
) -> dict:
    """
    Full pipeline: microphone → preprocessing → STT → text normalisation.
    Same return shape as process_audio_file.
    """
    stt = transcribe_from_mic(duration, language)
    raw = stt["text"]

    if normalize and raw.strip():
        norm = full_normalize(raw, use_ml=use_ml)
        return {
            "raw_transcription": raw,
            "normalized_text": norm["normalized_text"],
            "language": stt["language"],
            "normalization_source": norm["source"],
            "validation": norm["validation"],
        }

    return {
        "raw_transcription": raw,
        "normalized_text": raw,
        "language": stt["language"],
        "normalization_source": "none",
        "validation": True,
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

def _print_result(result: dict) -> None:
    sep = "=" * 70
    print(f"\n{sep}")
    print("RESULTS")
    print(sep)
    if "raw_transcription" in result:
        print(f"\nRaw transcription:\n{result['raw_transcription']}\n")
    if "normalized_text" in result:
        print(f"Normalized text:\n{result['normalized_text']}\n")
    print(f"Language            : {result.get('language', 'N/A')}")
    print(f"Normalisation source: {result.get('normalization_source', 'N/A')}")
    print(f"Validation passed   : {result.get('validation', 'N/A')}")
    print(sep)


def main() -> None:
    print("\n" + "=" * 70)
    print("CONVOINSIGHT — Whisper STT + Text Normaliser")
    print("=" * 70)

    while True:
        print("\nChoose input mode:")
        print("  1. Record from microphone")
        print("  2. Load audio file")
        print("  3. Normalise text only (no audio)")
        print("  4. Exit")

        choice = input("\nChoice (1–4): ").strip()

        if choice == "1":
            try:
                duration = int(input("Duration in seconds [10]: ").strip() or "10")
                use_ml = input("Use ML normalisation? (y/N): ").lower() == "y"
                _print_result(process_microphone(duration=duration, use_ml=use_ml))
            except KeyboardInterrupt:
                print("\nRecording cancelled.")
            except Exception as exc:
                print(f"Error: {exc}")

        elif choice == "2":
            path = input("Path to audio file: ").strip()
            if not os.path.exists(path):
                print(f"File not found: {path}")
                continue
            try:
                use_ml = input("Use ML normalisation? (y/N): ").lower() == "y"
                _print_result(process_audio_file(path, use_ml=use_ml))
            except Exception as exc:
                print(f"Error: {exc}")

        elif choice == "3":
            text = input("Enter text:\n> ").strip()
            if not text:
                print("No text entered.")
                continue
            try:
                use_ml = input("Use ML normalisation? (y/N): ").lower() == "y"
                norm = full_normalize(text, use_ml=use_ml)
                _print_result({
                    "raw_transcription": text,
                    "normalized_text": norm["normalized_text"],
                    "normalization_source": norm["source"],
                    "validation": norm["validation"],
                })
            except Exception as exc:
                print(f"Error: {exc}")

        elif choice == "4":
            print("Goodbye.")
            break

        else:
            print("Please enter 1, 2, 3, or 4.")


if __name__ == "__main__":
    main()
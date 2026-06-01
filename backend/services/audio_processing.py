"""
Audio Preprocessing - ConvoInsight
Converts any audio file to a clean 16kHz mono WAV ready for Whisper.
"""

import os
import numpy as np
import scipy.io.wavfile as wav
import noisereduce as nr
from pydub import AudioSegment, silence
from pydub.utils import which

# Point pydub at the system ffmpeg binaries
AudioSegment.converter = which("ffmpeg")
AudioSegment.ffprobe = which("ffprobe")


def normalize_audio(input_path: str) -> str:
    """
    Pre-process an audio file for Whisper:
      1. Convert to mono 16 kHz WAV
      2. Apply gentle stationary-agnostic noise reduction (60 %)
      3. Trim long silences (≥ 1.2 s), keeping 500 ms of padding

    Args:
        input_path: Path to any audio file supported by ffmpeg.

    Returns:
        Path to the cleaned WAV file (written next to the original).

    Raises:
        FileNotFoundError : input_path does not exist.
        RuntimeError      : ffmpeg is not installed / not on PATH.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Audio file not found: {input_path}")

    if which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not found. Install it and make sure it is on PATH.")

    base, _ = os.path.splitext(input_path)
    temp_wav = f"{base}_temp.wav"
    output_path = f"{base}_cleaned.wav"

    try:
        # ── Step 1: mono + 16 kHz ────────────────────────────────────────────
        audio = AudioSegment.from_file(input_path)
        audio = audio.set_channels(1).set_frame_rate(16_000)
        audio.export(temp_wav, format="wav")

        # ── Step 2: noise reduction ──────────────────────────────────────────
        rate, data = wav.read(temp_wav)

        # noisereduce needs float32; scipy reads int16 from a standard WAV
        data_float = data.astype(np.float32)
        reduced = nr.reduce_noise(
            y=data_float,
            sr=rate,
            prop_decrease=0.6,
            stationary=False,
        )

        # Normalise amplitude and convert back to int16 for WAV writing
        peak = np.max(np.abs(reduced))
        if peak > 0:
            reduced = reduced / peak
        reduced_int16 = (reduced * 32_767).astype(np.int16)
        wav.write(temp_wav, rate, reduced_int16)

        # ── Step 3: silence trimming ─────────────────────────────────────────
        audio = AudioSegment.from_wav(temp_wav)
        chunks = silence.split_on_silence(
            audio,
            min_silence_len=1_200,          # ms — only cut pauses ≥ 1.2 s
            silence_thresh=audio.dBFS - 20, # adaptive threshold
            keep_silence=500,               # ms of padding around each chunk
        )

        if chunks:
            cleaned = AudioSegment.empty()
            for chunk in chunks:
                cleaned += chunk
        else:
            # No chunks found means the whole file is below the silence
            # threshold — treat the original as already clean
            cleaned = audio

        cleaned.export(output_path, format="wav")

    finally:
        # Always remove the intermediate temp file
        if os.path.exists(temp_wav):
            os.remove(temp_wav)

    return output_path
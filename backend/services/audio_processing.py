
from pydub import AudioSegment, silence
from pydub.utils import which
import noisereduce as nr
import numpy as np
import scipy.io.wavfile as wav
import os

AudioSegment.converter = which("ffmpeg")
AudioSegment.ffprobe = which("ffprobe")


def normalize_audio(input_path: str) -> str:
    """
    Converts audio to:
    - mono
    - 16kHz
    - WAV
    Applies gentle noise reduction and safe silence trimming.
    Returns path to cleaned WAV file.
    """

    base, _ = os.path.splitext(input_path)
    output_path = f"{base}_cleaned.wav"
    temp_wav = f"{base}_temp.wav"

    audio = AudioSegment.from_file(input_path)

    audio = audio.set_channels(1)
    audio = audio.set_frame_rate(16000)

    audio.export(temp_wav, format="wav")

    rate, data = wav.read(temp_wav)

    reduced_noise = nr.reduce_noise(
        y=data,
        sr=rate,
        prop_decrease=0.6,      
        stationary=False        
    )

    reduced_noise = reduced_noise / np.max(np.abs(reduced_noise))
    reduced_noise = (reduced_noise * 32767).astype(np.int16)

    wav.write(temp_wav, rate, reduced_noise)

    audio = AudioSegment.from_wav(temp_wav)

    chunks = silence.split_on_silence(
        audio,
        min_silence_len=1200,    
        silence_thresh=audio.dBFS - 20,
        keep_silence=500
    )

    
    if not chunks:
        cleaned_audio = audio
    else:
        cleaned_audio = AudioSegment.empty()
        for chunk in chunks:
            cleaned_audio += chunk

    cleaned_audio.export(output_path, format="wav")

    if os.path.exists(temp_wav):
        os.remove(temp_wav)

    return output_path
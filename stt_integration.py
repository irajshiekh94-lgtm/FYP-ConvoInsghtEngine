
import whisper
import numpy as np
import sounddevice as sd
import soundfile as sf
import tempfile
import os
from pathlib import Path
from typing import Optional, Dict
import torch

from audio_processing import normalize_audio

from text_normalizer import full_normalize

_whisper_model = None
WHISPER_MODEL_SIZE = "base"  


def load_whisper_model(model_size: str = WHISPER_MODEL_SIZE):
    """Load Whisper model (singleton pattern)"""
    global _whisper_model
    if _whisper_model is None:
        print(f"Loading Whisper ({model_size})...")
        _whisper_model = whisper.load_model(model_size)
        print("Whisper ready")
    return _whisper_model

def record_audio(duration: int = 10, sample_rate: int = 16000) -> np.ndarray:
    """
    Record audio from microphone
    
    Args:
        duration: Recording duration in seconds
        sample_rate: Sample rate (Whisper uses 16kHz)
    
    Returns:
        Audio data as numpy array
    """
    print(f"\n Recording for {duration} seconds...")
    print("Speak now!")
    
    audio_data = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype='float32'
    )
    sd.wait()
    
    print(" Recording complete!")
    return audio_data.flatten()


def save_audio_temp(audio_data: np.ndarray, sample_rate: int = 16000) -> str:
    """Save audio to temporary WAV file"""
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    sf.write(temp_file.name, audio_data, sample_rate)
    return temp_file.name

def transcribe_audio(audio_path: str, language: Optional[str] = None) -> Dict:
    """
    Transcribe audio file using Whisper with preprocessing
    
    Args:
        audio_path: Path to audio file
        language: Language code (e.g., 'en', 'es'). None for auto-detect
    
    Returns:
        Transcription result with metadata
    """
    model = load_whisper_model()
    
    print(f"\n Preprocessing audio...")
    cleaned_path = None
    try:
        cleaned_path = normalize_audio(audio_path)
        audio_to_transcribe = cleaned_path
        print(f"Audio preprocessed: {cleaned_path}")
    except Exception as e:
        print(f" Preprocessing failed ({e}), using original audio")
        audio_to_transcribe = audio_path
    
    print(f"\n Transcribing audio...")
    
    result = model.transcribe(
        audio_to_transcribe,
        language=language,
        fp16=torch.cuda.is_available()
    )
    
    transcription = result["text"].strip()
    detected_lang = result.get("language", "unknown")
    
    print(f" Transcription complete! (Language: {detected_lang})")
    
    if cleaned_path and cleaned_path != audio_path and os.path.exists(cleaned_path):
        try:
            os.remove(cleaned_path)
        except:
            pass
    
    return {
        "text": transcription,
        "language": detected_lang,
        "segments": result.get("segments", [])
    }


def transcribe_from_mic(duration: int = 10, language: Optional[str] = None) -> Dict:
    """
    Record from microphone and transcribe
    
    Args:
        duration: Recording duration in seconds
        language: Language code (e.g., 'en', 'es'). None for auto-detect
    
    Returns:
        Transcription result with metadata
    """
    audio_data = record_audio(duration)
    
    temp_path = save_audio_temp(audio_data)
    
    try:
        result = transcribe_audio(temp_path, language)
        return result
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def process_audio_file(
    audio_path: str,
    normalize: bool = True,
    use_ml: bool = False, 
    language: Optional[str] = None
) -> Dict:
    """
    Complete pipeline: Audio file → Preprocessing → STT → Normalization
    
    Args:
        audio_path: Path to audio file
        normalize: Whether to normalize the transcription
        use_ml: Whether to use ML-based normalization (DEFAULT: False to avoid truncation)
        language: Language code for Whisper
    
    Returns:
        Dictionary with transcription and normalization results
    """
    stt_result = transcribe_audio(audio_path, language)
    raw_text = stt_result["text"]
    if normalize:
        norm_result = full_normalize(raw_text, use_ml=use_ml)
        return {
            "raw_transcription": raw_text,
            "normalized_text": norm_result["normalized_text"], 
            "language": stt_result["language"],
            "normalization_source": norm_result["source"],
            "validation": norm_result["validation"]
        }
    else:
        return {
            "raw_transcription": raw_text,
            "normalized_text": raw_text,
            "language": stt_result["language"],
            "normalization_source": "none",
            "validation": True
        }


def process_microphone(
    duration: int = 10,
    normalize: bool = True,
    use_ml: bool = False,  
    language: Optional[str] = None
) -> Dict:
    """
    Complete pipeline: Microphone → Preprocessing → STT → Normalization
    
    Args:
        duration: Recording duration in seconds
        normalize: Whether to normalize the transcription
        use_ml: Whether to use ML-based normalization (DEFAULT: False to avoid truncation)
        language: Language code for Whisper
    
    Returns:
        Dictionary with transcription and normalization results
    """
    stt_result = transcribe_from_mic(duration, language)
    raw_text = stt_result["text"]

    if normalize:
        norm_result = full_normalize(raw_text, use_ml=use_ml)
        return {
            "raw_transcription": raw_text,
            "normalized_text": norm_result["normalized_text"], 
            "language": stt_result["language"],
            "normalization_source": norm_result["source"],
            "validation": norm_result["validation"]
        }
    else:
        return {
            "raw_transcription": raw_text,
            "normalized_text": raw_text,
            "language": stt_result["language"],
            "normalization_source": "none",
            "validation": True
        }

def print_result(result: Dict):
    """Pretty print results"""
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    
    if "raw_transcription" in result:
        print(f"\n RAW TRANSCRIPTION:")
        print(f"{result['raw_transcription']}\n")
    
    if "normalized_text" in result:
        print(f" NORMALIZED TEXT:")
        print(f"{result['normalized_text']}\n")
    
    if "language" in result:
        print(f" Detected Language: {result['language']}")
    
    if "normalization_source" in result:
        print(f" Normalization Source: {result['normalization_source']}")
        print(f" Validation: {result.get('validation', 'N/A')}")
    
    print("=" * 80)


def main():
    """Interactive CLI for STT + Normalization"""
    print("\n" + "=" * 80)
    print("WHISPER STT + TEXT NORMALIZER (WITH AUDIO PREPROCESSING)")
    print("=" * 80)
    
    while True:
        print("\n Choose input mode:")
        print("1. Record from microphone")
        print("2. Load audio file")
        print("3. Text input only")
        print("4. Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == "1":
            try:
                duration = int(input("Recording duration in seconds (default 10): ") or "10")
                normalize = input("Normalize text? (y/n, default y): ").lower() != 'n'
                use_ml = input("Use ML normalization? (y/n, default n): ").lower() == 'y'
                
                result = process_microphone(
                    duration=duration,
                    normalize=normalize,
                    use_ml=use_ml
                )
                print_result(result)
                
            except KeyboardInterrupt:
                print("\n Recording cancelled")
            except Exception as e:
                print(f"\n Error: {e}")
        
        elif choice == "2":
          
            audio_path = input("Enter path to audio file: ").strip()
            
            if not os.path.exists(audio_path):
                print(f" File not found: {audio_path}")
                continue
            
            try:
                normalize = input("Normalize text? (y/n, default y): ").lower() != 'n'
                use_ml = input("Use ML normalization? (y/n, default n): ").lower() == 'y'
                
                result = process_audio_file(
                    audio_path=audio_path,
                    normalize=normalize,
                    use_ml=use_ml
                )
                print_result(result)
                
            except Exception as e:
                print(f"\n Error: {e}")
        
        elif choice == "3":
            # Text input only
            text = input("Enter text to normalize:\n> ").strip()
            
            if not text:
                print(" No text entered")
                continue
            
            try:
                use_ml = input("Use ML normalization? (y/n, default n): ").lower() == 'y'
                
                norm_result = full_normalize(text, use_ml=use_ml)
                
                result = {
                    "raw_transcription": text,
                    "normalized_text": norm_result["normalized_text"],
                    "normalization_source": norm_result["source"],
                    "validation": norm_result["validation"]
                }
                print_result(result)
                
            except Exception as e:
                print(f"\n Error: {e}")
        
        elif choice == "4":
            print("\n Goodbye!")
            break
        
        else:
            print(" Invalid choice. Please enter 1-4.")

def example_usage():
    """Example usage of the API"""

    print("\n📁 Example 1: Process audio file")
    result = process_audio_file(
        audio_path="sample.wav",
        normalize=True,
        use_ml=False
    )
    print(f"Normalized: {result['normalized_text']}")
    
    print("\n Example 2: Record from microphone")
    result = process_microphone(
        duration=5,
        normalize=True,
        use_ml=False
    )
    print(f"Normalized: {result['normalized_text']}")
    

    print("\n Example 3: Transcription only")
    stt_result = transcribe_audio("sample.wav")
    print(f"Raw transcription: {stt_result['text']}")


if __name__ == "__main__":
  
    main()
  
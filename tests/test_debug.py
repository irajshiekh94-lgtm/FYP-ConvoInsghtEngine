
import sys
import traceback

print("=" * 80)
print("AUDIO TRANSCRIPTION DEBUG TEST")
print("=" * 80)

print("\n[TEST 1] Importing modules...")
try:
    from audio_processing import normalize_audio
    print(" audio_processing imported")
except Exception as e:
    print(f" Failed to import audio_processing: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    from text_normalizer import full_normalize
    print(" text_normalizer imported")
except Exception as e:
    print(f" Failed to import text_normalizer: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    from stt_integration import transcribe_audio, process_audio_file
    print(" stt_integration imported")
except Exception as e:
    print(f" Failed to import stt_integration: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\n[TEST 2] Loading Whisper model...")
try:
    from stt_integration import load_whisper_model
    model = load_whisper_model()
    print(" Whisper model loaded")
except Exception as e:
    print(f" Failed to load Whisper: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\n[TEST 3] Testing text normalizer...")
try:
    test_text = "hey whts up bro, hows ur day goin"
    result = full_normalize(test_text, use_ml=False)
    print(f" Text normalizer works")
    print(f"   Input:  {test_text}")
    print(f"   Output: {result['normalized_text']}")
except Exception as e:
    print(f" Text normalizer failed: {e}")
    traceback.print_exc()

print("\n[TEST 4] Testing audio processing...")
sample_audio = input("Enter path to sample audio file (or press Enter to skip): ").strip()

if sample_audio:
    try:
        print(f"\nTesting with: {sample_audio}")
        
        print("\n   [4a] Testing audio preprocessing...")
        cleaned_path = normalize_audio(sample_audio)
        print(f"    Audio preprocessed: {cleaned_path}")
        
        print("\n   [4b] Testing transcription...")
        stt_result = transcribe_audio(cleaned_path)
        print(f"    Transcription: {stt_result['text'][:100]}...")
        print(f"    Language: {stt_result['language']}")
        
      
        print("\n   [4c] Testing full pipeline...")
        result = process_audio_file(
            audio_path=sample_audio,
            normalize=True,
            use_ml=False,
            language=None
        )
        print(f"    Pipeline complete!")
        print(f"   Raw: {result['raw_transcription'][:100]}...")
        print(f"   Normalized: {result['normalized_text'][:100]}...")
        
    except Exception as e:
        print(f"    Audio processing failed: {e}")
        print("\n   FULL TRACEBACK:")
        traceback.print_exc()
        print("\n   This is likely the same error causing your API 500 error!")
else:
    print("  Skipped audio test")

print("\n[TEST 5] Checking for common issues...")

print("\n   [5a] Checking ffmpeg...")
try:
    from pydub.utils import which
    ffmpeg_path = which("ffmpeg")
    ffprobe_path = which("ffprobe")
    if ffmpeg_path and ffprobe_path:
        print(f"    ffmpeg found: {ffmpeg_path}")
        print(f"    ffprobe found: {ffprobe_path}")
    else:
        print(f"   ffmpeg or ffprobe not found!")
        print(f"   ffmpeg: {ffmpeg_path}")
        print(f"   ffprobe: {ffprobe_path}")
except Exception as e:
    print(f"    Error checking ffmpeg: {e}")

print("\n   [5b] Checking CUDA availability...")
try:
    import torch
    cuda_available = torch.cuda.is_available()
    if cuda_available:
        print(f"    CUDA available: {torch.cuda.get_device_name(0)}")
    else:
        print(f" CUDA not available (using CPU - this is fine)")
except Exception as e:
    print(f"    Error checking CUDA: {e}")

print("\n   [5c] Checking memory database...")
try:
    import sqlite3
    import os
    if os.path.exists("memory.db"):
        conn = sqlite3.connect("memory.db")
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM memory")
        count = cur.fetchone()[0]
        print(f"    memory.db exists ({count} entries)")
        conn.close()
    else:
        print(f" memory.db doesn't exist yet (will be created)")
except Exception as e:
    print(f"   ش Error checking memory.db: {e}")

print("\n" + "=" * 80)
print("DEBUG TEST COMPLETE")
print("=" * 80)
print("\nIf you see errors above, they are likely causing your API 500 error.")
print("Common fixes:")
print("  1. If ffmpeg missing: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)")
print("  2. If import errors: pip install -r requirements.txt")
print("  3. If CUDA errors: Set DEVICE='cpu' in text_normalizer.py")
print("  4. If audio errors: Check audio file format and path")
print("\nTo get more details, run the API with the updated api.py that has better logging.")
print("=" * 80)
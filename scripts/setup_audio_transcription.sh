#!/bin/bash

echo "=========================================="
echo "Audio Transcription Integration Setup"
echo "=========================================="
echo ""

echo "📦 Step 1: Creating backups..."
mkdir -p backups
cp stt_integration.py backups/stt_integration.py.backup 2>/dev/null
cp requirements.txt backups/requirements.txt.backup 2>/dev/null
echo "✅ Backups created in ./backups/"
echo ""

echo "🔍 Step 2: Checking for obsolete files..."
if [ -f "transcription.py" ]; then
    echo "Found transcription.py - moving to backups/"
    mv transcription.py backups/transcription.py.backup
    echo "✅ transcription.py backed up and removed"
else
    echo "✅ No transcription.py found (already removed or doesn't exist)"
fi
echo ""

echo "📝 Step 3: Updating requirements.txt..."
if ! grep -q "sounddevice" requirements.txt; then
    echo "" >> requirements.txt
    echo "# Audio Recording (for microphone support)" >> requirements.txt
    echo "sounddevice>=0.4.6" >> requirements.txt
    echo "✅ Added sounddevice to requirements.txt"
else
    echo "✅ sounddevice already in requirements.txt"
fi
echo ""

echo "🔍 Step 4: Checking system dependencies..."

if command -v ffmpeg &> /dev/null; then
    echo "ffmpeg found: $(ffmpeg -version | head -n 1)"
else
    echo "  ffmpeg NOT found!"
    echo "   Please install ffmpeg:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   macOS: brew install ffmpeg"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "   Linux: sudo apt-get install ffmpeg"
    else
        echo "   Windows: Download from https://ffmpeg.org/download.html"
    fi
fi
echo ""

echo " Step 5: Installing Python dependencies..."
read -p "Install/update Python packages now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pip install -r requirements.txt
    echo "Python packages installed"
else
    echo "⏭  Skipped. Run 'pip install -r requirements.txt' later"
fi
echo ""

echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📋 Summary of changes:"
echo "  1. ✅ Backed up existing files to ./backups/"
echo "  2. ✅ Removed obsolete transcription.py (if found)"
echo "  3. ✅ Updated requirements.txt with sounddevice"
echo "  4. ℹ️  Ready to replace stt_integration.py"
echo ""
echo "📝 Next steps:"
echo "  1. Replace stt_integration.py with the updated version"
echo "  2. Test the integration:"
echo "     python stt_integration.py"
echo "  3. Or test via API:"
echo "     python api.py"
echo ""
echo "🧪 Quick test command:"
echo "  python -c 'from stt_integration import load_whisper_model; load_whisper_model()'"
echo ""
echo "📚 For more info, see: Audio Integration Guide"
echo ""
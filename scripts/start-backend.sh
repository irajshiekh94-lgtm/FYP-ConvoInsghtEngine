#!/bin/bash
# ConvoInsight Unified Backend Server Startup Script

set -e

echo "=================================================="
echo "🚀 ConvoInsight Engine - Unified Backend Server"
echo "=================================================="

# Check if running from project root
if [ ! -f "backend/server.py" ]; then
    echo "❌ Error: Please run this script from the project root"
    echo "   Example: cd /path/to/model && ./scripts/start-backend.sh"
    exit 1
fi

# Activate virtual environment
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  Virtual environment not found. Make sure dependencies are installed."
    echo "   Run: pip install -r requirements.txt"
fi

# Check Python version
PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
echo "✓ Using Python $PYTHON_VERSION"

# Check required modules
echo "✓ Checking dependencies..."
python -c "import fastapi, flask, transformers, torch" 2>/dev/null || {
    echo "❌ Missing dependencies. Running: pip install -r requirements.txt"
    pip install -r requirements.txt
}

# Start server
echo ""
echo "=================================================="
echo "🎯 Starting API Server on http://localhost:8000"
echo "=================================================="
echo ""
echo "📚 Documentation:"
echo "   - Swagger UI:  http://localhost:8000/docs"
echo "   - ReDoc:       http://localhost:8000/redoc"
echo ""
echo "To stop the server, press Ctrl+C"
echo "=================================================="
echo ""

cd "$(dirname "$0")/.."
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

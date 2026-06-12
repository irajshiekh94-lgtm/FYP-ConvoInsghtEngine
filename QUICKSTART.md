# Quick Start Guide - ConvoInsight Backend

## 1. First Time Setup

```bash
# Navigate to project
cd /path/to/model

# Install Python dependencies
pip install -r requirements.txt

# Verify installation
python tests/integration_test.py
```

## 2. Starting the Backend

### Quick Start (Recommended)
```bash
./scripts/start-backend.sh
```

### Manual Start
```bash
source venv/bin/activate
python -m uvicorn backend.server:app --reload
```

### Server Running ✓
You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

## 3. Testing the API

### Browser
Open http://localhost:8000/docs - Interactive API documentation

### Command Line
```bash
# Health check
curl http://localhost:8000/api/health

# Normalize text
curl -X POST http://localhost:8000/normalize/text \
  -H "Content-Type: application/json" \
  -d '{"text": "hello world", "use_ml": false}'
```

## 4. Upload a WhatsApp Chat

### Export from WhatsApp
1. Open WhatsApp Web or Android app
2. Select chat → Menu → More → Export chat
3. Choose "Without media"
4. Save as text file

### Upload via API
```bash
# Using Python
python -c "
import requests
import json

with open('your_chat.txt', 'r') as f:
    raw_text = f.read()

data = {
    'rawText': raw_text,
    'currentUser': 'Your Name',
    'chatName': 'My Chat'
}

response = requests.post(
    'http://localhost:8000/api/chats/upload',
    json=data
)

result = response.json()
print(json.dumps(result, indent=2))
"
```

## 5. Environment Setup

Create `.env` file in project root:

```bash
# MongoDB (optional but recommended)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/convoinsight

# Meta Llama summarization (pick one provider)

# Option A — Local Ollama (recommended for dev)
LLAMA_PROVIDER=ollama
LLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434

# Option B — Groq cloud (fast, free tier available)
# LLAMA_PROVIDER=groq
# LLAMA_MODEL=llama-3.3-70b-versatile
# GROQ_API_KEY=your_groq_api_key

# Option C — Together AI
# LLAMA_PROVIDER=together
# LLAMA_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
# TOGETHER_API_KEY=your_together_api_key

# Frontend
EXPO_PUBLIC_DOMAIN=localhost:8000
```

### Ollama setup (Option A)

```bash
# Install from https://ollama.com/download (macOS app or: brew install ollama)
ollama pull llama3.2
ollama serve   # or launch the Ollama app — listens on :11434

# Verify backend can reach Llama
curl http://localhost:8000/api/llama/test
```

Restart the FastAPI server after changing `.env`.

## 6. Troubleshooting

### "ModuleNotFoundError: No module named 'backend'"
```bash
# Make sure you're in the project root
cd /path/to/model

# And activate venv
source venv/bin/activate
```

### "Port 8000 already in use"
```bash
# Use different port
python -m uvicorn backend.server:app --port 8001
```

### "MongoDB connection failed"
This is OK - the API runs in local mode. To enable MongoDB:
1. Install MongoDB locally or use cloud service
2. Set MONGODB_URI in .env
3. Restart server

### Models not downloading
First run might download:
- Whisper model (~1.5GB)
- BERT model (~400MB)
- Pyannote model (~500MB)

Patience required on first startup ⏳

## 7. Common Commands

### Restart Backend
```bash
# Ctrl+C to stop
# Then:
./scripts/start-backend.sh
```

### Check Logs
Look at console output when server is running. Logs show:
- API calls (GET, POST, etc.)
- Error messages
- Model loading status
- Database connection status

### Test All Endpoints
```bash
python tests/integration_test.py
```

### Check All Services
```bash
python -c "
from backend.services.clustering import ClusteringService
from backend.services.summarization import SummarizationService
print('✓ All services loaded')
"
```

## 8. Next Steps

- [ ] Start backend: `./scripts/start-backend.sh`
- [ ] Open http://localhost:8000/docs in browser
- [ ] Try uploading a WhatsApp chat
- [ ] Test transcribing audio
- [ ] Connect frontend (check EXPO_PUBLIC_DOMAIN env var)

## 9. Documentation

- **Full API Reference**: See BACKEND_API.md
- **Integration Details**: See INTEGRATION_REPORT.md
- **API Interactive Docs**: http://localhost:8000/docs

---

**Ready to go!** 🚀

Start the backend and begin processing conversations.

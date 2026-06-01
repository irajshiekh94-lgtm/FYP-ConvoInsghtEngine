#!/usr/bin/env python
"""
Integration Test for ConvoInsight Unified Backend
Tests all major components and endpoints
"""

import sys
import subprocess
import time
import requests
import json
from pathlib import Path

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"  {text}")
    print(f"{'=' * 60}\n")

def test_imports():
    """Test that all services import correctly"""
    print_header("1. Testing Module Imports")
    
    try:
        print("  Testing FastAPI...", end="", flush=True)
        from fastapi import FastAPI
        print(" ✓")
    except Exception as e:
        print(f" ✗ {e}")
        return False
    
    try:
        print("  Testing services...", end="", flush=True)
        from backend.services.clustering import ClusteringService
        from backend.services.summarization import SummarizationService
        from backend.services.intentpipeline import classify_all
        from backend.services.text_normalizer import full_normalize
        from backend.services.whatsapp_parser import parse_chat_from_text
        print(" ✓")
    except Exception as e:
        print(f" ✗ {e}")
        return False
    
    try:
        print("  Testing unified server...", end="", flush=True)
        from backend.server import app
        print(" ✓")
        print(f"  Server has {len(app.routes)} routes")
    except Exception as e:
        print(f" ✗ {e}")
        return False
    
    return True

def test_server_startup():
    """Test that server starts without errors"""
    print_header("2. Testing Server Startup")
    
    print("  Starting server on http://127.0.0.1:8000...")
    proc = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'backend.server:app', 
         '--host', '127.0.0.1', '--port', '8000'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    time.sleep(3)
    
    if proc.poll() is not None:
        stdout, stderr = proc.communicate()
        print(f"  ✗ Server failed to start")
        if stderr:
            print(f"     Error: {stderr[:200]}")
        return False, None
    
    print("  ✓ Server started successfully")
    return True, proc

def test_endpoints(proc):
    """Test API endpoints"""
    print_header("3. Testing API Endpoints")
    
    base_url = "http://127.0.0.1:8000"
    endpoints_ok = 0
    
    # Test health endpoint
    try:
        print("  GET /api/health...", end="", flush=True)
        resp = requests.get(f"{base_url}/api/health", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f" ✓ (database: {data.get('database', 'unknown')})")
            endpoints_ok += 1
        else:
            print(f" ✗ (status: {resp.status_code})")
    except Exception as e:
        print(f" ✗ ({e})")
    
    # Test root health endpoint
    try:
        print("  GET /health...", end="", flush=True)
        resp = requests.get(f"{base_url}/health", timeout=5)
        if resp.status_code == 200:
            print(" ✓")
            endpoints_ok += 1
        else:
            print(f" ✗ (status: {resp.status_code})")
    except Exception as e:
        print(f" ✗ ({e})")
    
    # Test docs endpoint
    try:
        print("  GET /docs (Swagger)...", end="", flush=True)
        resp = requests.get(f"{base_url}/docs", timeout=5)
        if resp.status_code == 200:
            print(" ✓")
            endpoints_ok += 1
        else:
            print(f" ✗ (status: {resp.status_code})")
    except Exception as e:
        print(f" ✗ ({e})")
    
    # Test normalize endpoint
    try:
        print("  POST /normalize/text...", end="", flush=True)
        payload = {"text": "hello world", "use_ml": False}
        resp = requests.post(f"{base_url}/normalize/text", 
                           json=payload, timeout=5)
        if resp.status_code == 200:
            print(" ✓")
            endpoints_ok += 1
        else:
            print(f" ✗ (status: {resp.status_code})")
    except Exception as e:
        print(f" ✗ ({e})")
    
    print(f"\n  Result: {endpoints_ok}/4 endpoints working")
    return endpoints_ok >= 3

def test_services():
    """Test service initialization"""
    print_header("4. Testing Service Initialization")
    
    try:
        print("  Initializing ClusteringService...", end="", flush=True)
        from backend.services.clustering import ClusteringService
        svc = ClusteringService()
        print(" ✓")
    except Exception as e:
        print(f" ✗ {e}")
        return False
    
    try:
        print("  Initializing SummarizationService...", end="", flush=True)
        from backend.services.summarization import SummarizationService
        svc = SummarizationService()
        print(" ✓")
    except Exception as e:
        print(f" ✗ {e}")
        return False
    
    try:
        print("  Loading TextNormalizer...", end="", flush=True)
        from backend.services.text_normalizer import full_normalize
        result = full_normalize("test text", use_ml=False)
        if result.get("validation"):
            print(" ✓")
        else:
            print(" ✗ (validation failed)")
            return False
    except Exception as e:
        print(f" ✗ {e}")
        return False
    
    try:
        print("  Testing WhatsApp Parser...", end="", flush=True)
        from backend.services.whatsapp_parser import parse_chat_from_text
        sample = "5/28/24, 2:14 PM - User1: Hello\n5/28/24, 2:15 PM - User2: Hi there"
        result = parse_chat_from_text(sample, "Test Chat")
        if result.get("messages"):
            print(" ✓")
        else:
            print(" ✗ (no messages parsed)")
            return False
    except Exception as e:
        print(f" ✗ {e}")
        return False
    
    return True

def main():
    print("\n" + "=" * 60)
    print("  ConvoInsight Unified Backend - Integration Test")
    print("=" * 60)
    
    # Check current directory
    if not Path("backend/server.py").exists():
        print("\n✗ Error: Please run from project root")
        print("  cd /path/to/model && python tests/integration_test.py")
        return 1
    
    # Activate venv if needed
    sys.path.insert(0, '.')
    
    # Run tests
    all_pass = True
    
    if not test_imports():
        all_pass = False
    
    server_ok, proc = test_server_startup()
    if server_ok:
        try:
            if not test_endpoints(proc):
                all_pass = False
            
            if not test_services():
                all_pass = False
        finally:
            if proc:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except:
                    proc.kill()
    else:
        all_pass = False
    
    # Summary
    print_header("Integration Test Summary")
    if all_pass:
        print("  ✓ ALL TESTS PASSED")
        print("\n  You can start the server with:")
        print("    ./scripts/start-backend.sh")
        print("  or")
        print("    python -m uvicorn backend.server:app --reload")
        print("\n  API docs available at: http://localhost:8000/docs")
        return 0
    else:
        print("  ✗ SOME TESTS FAILED")
        print("\n  Check the errors above and try:")
        print("    pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())

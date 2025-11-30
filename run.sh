#!/usr/bin/env bash
# Script chạy FastAPI server

set -e

echo "👉 Kích hoạt .venv..."
source .venv/bin/activate

echo "👉 Chạy Uvicorn..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

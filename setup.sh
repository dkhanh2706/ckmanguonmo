#!/usr/bin/env bash
# Script setup môi trường cho FastAPI project

set -e  # lỗi là dừng luôn

echo "👉 Tạo virtual env (.venv) nếu chưa có..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "✅ Đã tạo .venv"
else
    echo "✅ .venv đã tồn tại, bỏ qua bước tạo"
fi

echo "👉 Kích hoạt .venv..."
source .venv/bin/activate

echo "👉 Cài thư viện từ requirements.txt (nếu có)..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "⚠ Không thấy requirements.txt, cài vài package cơ bản..."
    pip install fastapi "uvicorn[standard]" sqlalchemy psycopg2-binary "passlib[bcrypt]" email-validator jinja2 python-dotenv
fi

echo "🎉 Setup xong!"
echo "➡ Lần sau chỉ cần: source .venv/bin/activate && bash run.sh"

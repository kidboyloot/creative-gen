#!/bin/bash
set -e

echo "Starting Creative Gen..."

# Backend
cd "$(dirname "$0")/backend"
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "Backend running on http://localhost:8000 (PID $BACKEND_PID)"

# Frontend
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend running on http://localhost:5173 (PID $FRONTEND_PID)"

echo ""
echo "Open http://localhost:5173 in your browser"
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait

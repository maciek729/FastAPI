@echo off
echo Starting FastAPI backend...
start cmd /k "cd backend && .\fastapienv\Scripts\activate && uvicorn main:app --reload"

echo Starting frontend...
start cmd /k "cd frontend && npm run dev"

echo Both backend and frontend are running!

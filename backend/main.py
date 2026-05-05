"""
main.py — IntelliMind FastAPI Application
==========================================
Run with:  uvicorn main:app --reload --port 8000
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app import chat, student, debug

app = FastAPI(
    title="IntelliMind API",
    description="Backend for IntelliMind AI Learning Intelligence",
    version="1.0.0",
)

# CORS — read from .env
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5501,http://localhost:5501")
allowed_origins = [o.strip() for o in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,    tags=["Chat"])
app.include_router(student.router, tags=["Student"])
app.include_router(debug.router,   tags=["Debug"])

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "IntelliMind API", "version": "1.0.0"}

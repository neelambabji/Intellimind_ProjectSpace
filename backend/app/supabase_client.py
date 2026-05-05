"""
supabase_client.py — Supabase Python Client
"""
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise RuntimeError("[supabase_client] SUPABASE_URL or SUPABASE_KEY missing from .env")

supabase: Client = create_client(url, key)

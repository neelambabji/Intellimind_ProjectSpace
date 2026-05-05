"""
debug.py — Diagnostic Endpoints
=================================
GET /debug/student/{roll}

Tells you EXACTLY what is being returned from each RPC,
what DB is being queried, and any errors — so you can
pinpoint the problem fast.

Remove or disable this file before going to production.
"""

from fastapi import APIRouter
from app.supabase_client import supabase
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()


@router.get("/debug/student/{roll}")
def debug_student(roll: str):
    """
    Call this from your browser:
    http://127.0.0.1:8000/debug/student/23A91A0509

    Shows raw output from every RPC + connection info.
    """
    roll = roll.upper().strip()

    results = {
        "roll_tested": roll,
        "supabase_url": os.getenv("SUPABASE_URL", "NOT SET"),
        "rpcs": {}
    }

    # ── Test get_student_summary ──
    try:
        r = supabase.rpc("get_student_summary", {"student_roll": roll}).execute()
        results["rpcs"]["get_student_summary"] = {
            "status": "success",
            "data": r.data,
            "count": len(r.data) if isinstance(r.data, list) else "not a list",
            "is_empty": not r.data
        }
    except Exception as e:
        results["rpcs"]["get_student_summary"] = {
            "status": "error",
            "error": str(e)
        }

    # ── Test get_student_activity ──
    try:
        r = supabase.rpc("get_student_activity", {"student_roll": roll}).execute()
        results["rpcs"]["get_student_activity"] = {
            "status": "success",
            "data": r.data,
            "count": len(r.data) if isinstance(r.data, list) else "not a list",
            "is_empty": not r.data
        }
    except Exception as e:
        results["rpcs"]["get_student_activity"] = {
            "status": "error",
            "error": str(e)
        }

    # ── Test get_recent_activity ──
    try:
        r = supabase.rpc("get_recent_activity", {"student_roll": roll}).execute()
        results["rpcs"]["get_recent_activity"] = {
            "status": "success",
            "data": r.data,
            "count": len(r.data) if isinstance(r.data, list) else "not a list",
            "is_empty": not r.data
        }
    except Exception as e:
        results["rpcs"]["get_recent_activity"] = {
            "status": "error",
            "error": str(e)
        }

    # ── Try a raw direct table query to confirm connection ──
    # Change "login_logs" to any table you know exists in this DB
    try:
        r = supabase.table("login_logs").select("*").limit(3).execute()
        results["direct_table_test"] = {
            "table": "login_logs",
            "status": "success",
            "rows_found": len(r.data) if r.data else 0,
            "sample": r.data[:2] if r.data else []
        }
    except Exception as e:
        results["direct_table_test"] = {
            "table": "login_logs",
            "status": "error",
            "error": str(e),
            "hint": "If this errors, the SUPABASE_URL/KEY in .env might be wrong"
        }

    return results


@router.get("/debug/tables")
def debug_tables():
    """
    Lists what the Supabase connection can see.
    http://127.0.0.1:8000/debug/tables
    """
    return {
        "supabase_url": os.getenv("SUPABASE_URL", "NOT SET"),
        "key_prefix": os.getenv("SUPABASE_KEY", "")[:20] + "...",
        "message": "Check /debug/student/{roll} for RPC diagnostics"
    }

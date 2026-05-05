"""
student_service.py — Fetch Student Data from Supabase RPCs
"""
from app.supabase_client import supabase


def get_student_summary(student_roll: str):
    try:
        r = supabase.rpc("get_student_summary", {"student_roll": student_roll}).execute()
        return r.data
    except Exception as e:
        print(f"[student_service] get_student_summary error: {e}")
        return None


def get_student_activity(student_roll: str):
    try:
        r = supabase.rpc("get_student_activity", {"student_roll": student_roll}).execute()
        return r.data
    except Exception as e:
        print(f"[student_service] get_student_activity error: {e}")
        return None


def get_recent_activity(student_roll: str):
    try:
        r = supabase.rpc("get_recent_activity", {"student_roll": student_roll}).execute()
        return r.data
    except Exception as e:
        print(f"[student_service] get_recent_activity error: {e}")
        return None

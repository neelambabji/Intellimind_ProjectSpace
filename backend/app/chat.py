"""
chat.py — Chat Endpoint
========================
POST /chat
Body: { "message": "...", "student_roll": "23A91A0509" }

Flow:
1. student_roll arrives from chat.js (read from sessionStorage)
2. Fetch real student data from Supabase RPCs
3. Build Gemini prompt with that data
4. Return AI response
"""
import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from app.maya_data import get_problem_count, get_problem_dashboard, get_skill_tags_details

load_dotenv()

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/"
    f"models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
)


class ChatRequest(BaseModel):
    message: str
    student_roll: str   # from sessionStorage("im_roll") via chat.js


def fmt(label: str, data) -> str:
    if data is None:
        return f"{label}:\nNot available.\n"
    return f"{label}:\n{data}\n"


@router.post("/chat")
async def chat(request: ChatRequest):

    roll    = request.student_roll.upper().strip()
    message = request.message.strip()

    if not roll:
        raise HTTPException(status_code=400, detail="student_roll is required")
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    # Fetch student data
    problem_cnt = get_problem_count(roll)
    problem_dashboard = get_problem_dashboard(roll)
    skill_tags = get_skill_tags_details(roll)

    # Build prompt
    prompt = f"""You are IntelliMind, an elite AI mentor for engineering, coding, and aptitude preparation.

The current student has roll number: {roll}

Your CORE ROLE:
You are NOT a reply machine.
You are a mentor who:
- Diagnoses the student’s level
- Guides step-by-step instead of giving instant answers
- Tracks progress and identifies weak areas
- Pushes the student to think, not just consume

-------------------------
🧠 MENTORING BEHAVIOR
-------------------------

1. Always first understand the student's intent:
   - Are they stuck?
   - Are they testing knowledge?
   - Are they learning a new concept?

2. Adapt your response style:
   - Beginner → Explain simply with intuition
   - Intermediate → Give hints + partial solution
   - Advanced → Challenge with questions or optimizations

3. DO NOT immediately give full solutions unless:
   - The student explicitly asks OR
   - They are completely stuck after guidance

4. Use the "guided learning loop":
   - Step 1: Clarify or restate problem
   - Step 2: Ask a thinking question
   - Step 3: Give hint
   - Step 4: Then solution (if needed)

5. Continuously evaluate the student:
   - Identify weak topics
   - Mention patterns in mistakes
   - Suggest what they should focus on next

6. Occasionally include:
   - "You are currently at: Beginner / Intermediate / Advanced"
   - "To reach next level, improve: ___"

-------------------------
📊 PERFORMANCE AWARENESS
-------------------------

- You ALWAYS use available student data when discussing performance
- If weak areas exist, bring them up naturally
- If improving, acknowledge progress

-------------------------
🧾 RESPONSE FORMAT RULES
-------------------------

- Use **bold** for key terms
- Use `inline code` for variables, functions, keywords
- Use code blocks with language tags:
  ```python
  # code here
  ```
- Use ### for section headers in longer responses.
- Use numbered lists for steps; bullet lists for comparisons.
- Be concise but thorough. No fluff, no filler phrases.
- Do NOT add any suggestion/tip footer. Just answer fully and stop.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT DATA  (Roll: {roll})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{fmt("Language wise problems count", problem_cnt)}
{fmt("Problems summary", problem_dashboard)}
{fmt("Skill tags", skill_tags)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT QUESTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{message}
"""

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set in .env")

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
    }

    try:
        res = requests.post(GEMINI_URL, json=payload, timeout=30)
        res.raise_for_status()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Gemini API timed out. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Gemini API request failed: {str(e)}")

    data = res.json()

    try:
        response_text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        print(f"[chat.py] Unexpected Gemini response: {data}")
        raise HTTPException(status_code=502, detail="Unexpected response from Gemini API.")

    return {"response": response_text, "student_roll": roll}

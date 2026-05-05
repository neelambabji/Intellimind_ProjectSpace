# IntelliMind — Complete Project

## File Structure

```
intellimind/
│
├── frontend/                          ← Open with VS Code Live Server
│   ├── index.html                     ← Landing page
│   ├── chat.html                      ← Chatbot (session-guarded)
│   ├── chat.js                        ← Reads im_roll from sessionStorage ⭐
│   │
│   ├── css/                           ← Landing page styles
│   │   ├── main.css
│   │   ├── navbar.css
│   │   ├── hero.css
│   │   ├── platforms.css
│   │   └── coach.css
│   │
│   ├── js/                            ← Landing page components
│   │   ├── navbar.js
│   │   ├── hero.js
│   │   ├── platforms.js
│   │   ├── coach.js
│   │   └── main.js
│   │
│   └── login/                         ← Login page (Supabase Auth)
│       ├── index.html
│       ├── css/
│       │   ├── variables.css
│       │   ├── base.css
│       │   ├── left-panel.css
│       │   └── form.css
│       └── js/
│           ├── env.js                 ← All frontend keys & config
│           ├── supabaseClient.js      ← Both Supabase clients
│           ├── authService.js         ← Login + stores im_roll ⭐
│           └── login.js               ← Form UI controller
│
└── backend/                           ← FastAPI Python server
    ├── .env                           ← Secret keys (NEVER commit)
    ├── .gitignore
    ├── requirements.txt
    ├── main.py                        ← FastAPI app + CORS
    └── app/
        ├── __init__.py
        ├── supabase_client.py         ← Python Supabase client
        ├── student_service.py         ← Calls Supabase RPCs
        ├── student.py                 ← GET /student-* endpoints
        └── chat.py                    ← POST /chat endpoint ⭐
```

---

## How the Login → Chatbot Connection Works

```
Student enters roll number on login page
        ↓
authService.js calls Supabase Auth (signInWithPassword)
        ↓
On success → sessionStorage.setItem("im_roll", "23A91A0509")
        ↓
Redirects to chat.html
        ↓
chat.js reads: const STUDENT_ROLL = sessionStorage.getItem("im_roll")
        ↓
Every message sent to backend includes: { message, student_roll }
        ↓
FastAPI chat.py fetches real student data from Supabase RPCs
        ↓
Injects data into Gemini prompt → personalised AI response
        ↓
Response returned to chat.html
```

---

## Running the Project

### 1. Start the Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend runs at: http://127.0.0.1:8000

Test it: http://127.0.0.1:8000/docs (Swagger UI)

### 2. Start the Frontend
Open `frontend/` folder in VS Code and click **Go Live** (Live Server).

Make sure Live Server uses port **5501** (check `.vscode/settings.json`).

Frontend runs at: http://127.0.0.1:5501

### 3. Visit the app
- Landing page:  http://127.0.0.1:5501/index.html
- Login page:    http://127.0.0.1:5501/login/index.html
- Chatbot:       http://127.0.0.1:5501/chat.html (redirects to login if not signed in)

---

## Backend API Endpoints

| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | /                           | Health check                       |
| POST   | /chat                       | Send message, get AI response      |
| GET    | /student-summary/{roll}     | Get student performance summary    |
| GET    | /student-activity/{roll}    | Get full activity breakdown        |
| GET    | /recent-activity/{roll}     | Get recent activity entries        |

### POST /chat — Request Body
```json
{
  "message": "What are my weak topics?",
  "student_roll": "23A91A0509"
}
```

---

## Security Notes
- `backend/.env` contains secrets — it is in `.gitignore`, never commit it
- Supabase uses `sessionStorage` (not `localStorage`) — session clears on tab close
- `chat.html` has a session guard — redirects to login if no active session
- CORS is restricted to `localhost:5501` only — update `ALLOWED_ORIGINS` in `.env` for production

/* ============================================================
   chat.js  —  IntelliMind Chatbot Frontend Logic
   ============================================================
   - STUDENT_ROLL is read from sessionStorage("im_roll")
     which is set by authService.js during login.
   - Backend uses the roll to fetch real Supabase data and
     inject it into the AI prompt.
   ============================================================ */

const BACKEND_URL  = "http://127.0.0.1:8000/chat";

// ⭐ Read from sessionStorage — set by authService.js on login
const STUDENT_ROLL = sessionStorage.getItem("im_roll") || "";

// Safety: if no roll found, redirect to login
if (!STUDENT_ROLL) {
  console.warn("[chat.js] No im_roll in sessionStorage. Redirecting to login.");
  window.location.replace("login/index.html");
}

let chatHistory = [];
let chatStarted = false;
let isWaiting   = false;

/* ── BACKEND CALL ── */
async function callGemini(userMsg) {
  const res = await fetch(BACKEND_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message:      userMsg,
      student_roll: STUDENT_ROLL
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Backend error ${res.status}`);
  }

  const data = await res.json();
  return data.response;
}

/* ════════════════════════════════
   MARKDOWN → HTML
════════════════════════════════ */
function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function renderMarkdown(raw) {
  const parts   = [];
  const CODE_RE = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = CODE_RE.exec(raw)) !== null) {
    if (m.index > last) parts.push({ t:"text", v: raw.slice(last, m.index) });
    parts.push({ t:"code", lang: m[1] || "text", v: m[2] });
    last = CODE_RE.lastIndex;
  }
  if (last < raw.length) parts.push({ t:"text", v: raw.slice(last) });
  return parts.map(p => p.t === "code" ? buildCodeBlock(p.lang, p.v) : renderText(p.v)).join("");
}

function renderText(raw) {
  let s = esc(raw);
  s = s.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  s = s.replace(/^## (.+)$/gm,  "<h3>$1</h3>");
  s = s.replace(/^# (.+)$/gm,   "<h3>$1</h3>");
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>");
  s = s.replace(/__(.+?)__/g,         "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g,         "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/^---+$/gm, "<hr>");
  s = s.replace(/((?:^\d+\. .+\n?)+)/gm, blk =>
    "<ol>" + blk.trim().split("\n").map(l => "<li>" + l.replace(/^\d+\.\s+/, "") + "</li>").join("") + "</ol>");
  s = s.replace(/((?:^[•\-\*] .+\n?)+)/gm, blk =>
    "<ul>" + blk.trim().split("\n").map(l => "<li>" + l.replace(/^[•\-\*]\s+/, "") + "</li>").join("") + "</ul>");
  s = s.split(/\n{2,}/).map(para => {
    para = para.trim();
    if (!para) return "";
    if (/^<(h3|ul|ol|hr)/.test(para)) return para;
    return "<p>" + para.replace(/\n/g, "<br>") + "</p>";
  }).join("");
  return s;
}

function buildCodeBlock(lang, code) {
  const id          = "cb" + Math.random().toString(36).slice(2, 9);
  const highlighted = highlight(esc(code.trimEnd()), lang.toLowerCase());
  return `
<div class="code-block">
  <div class="code-header">
    <div class="code-dots"><span class="d1"></span><span class="d2"></span><span class="d3"></span></div>
    <span class="code-lang">${esc(lang || "code")}</span>
    <button class="copy-btn" onclick="copyCode('${id}',this)">
      <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copy
    </button>
  </div>
  <div class="code-body" id="${id}">${highlighted}</div>
</div>`;
}

function highlight(html, lang) {
  if (["python","py"].includes(lang)) {
    return html
      .replace(/(#[^\n]*)/g, '<span class="tok-cmt">$1</span>')
      .replace(/\b(def|class|return|if|elif|else|for|while|import|from|as|in|not|and|or|is|None|True|False|pass|break|continue|try|except|with|lambda|yield|async|await|raise|del|global|nonlocal|print)\b/g, '<span class="tok-kw">$1</span>')
      .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="tok-cls">$1</span>')
      .replace(/([a-zA-Z_]\w*)\s*(?=\()/g,  '<span class="tok-fn">$1</span>')
      .replace(/(&#39;.*?&#39;|&quot;.*?&quot;)/g, '<span class="tok-str">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
  }
  if (["js","javascript","ts","typescript"].includes(lang)) {
    return html
      .replace(/(\/\/[^\n]*)/g, '<span class="tok-cmt">$1</span>')
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|new|this|import|export|from|of|in|typeof|instanceof|async|await|try|catch|finally|throw|null|undefined|true|false|switch|case|default|break|continue|do|extends|super|=&gt;)\b/g, '<span class="tok-kw">$1</span>')
      .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="tok-cls">$1</span>')
      .replace(/([a-zA-Z_$]\w*)\s*(?=\()/g, '<span class="tok-fn">$1</span>')
      .replace(/(&#39;.*?&#39;|&quot;.*?&quot;)/g, '<span class="tok-str">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
  }
  if (["java","cpp","c"].includes(lang)) {
    return html
      .replace(/(\/\/[^\n]*)/g, '<span class="tok-cmt">$1</span>')
      .replace(/\b(int|long|float|double|char|boolean|void|class|public|private|protected|static|final|return|if|else|for|while|new|this|import|package|interface|extends|implements|try|catch|finally|throw|null|true|false|String|System|out|println|include|using|namespace|std|cout|cin|endl|auto|template|typename)\b/g, '<span class="tok-kw">$1</span>')
      .replace(/([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="tok-fn">$1</span>')
      .replace(/(&#34;.*?&#34;)/g, '<span class="tok-str">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
  }
  if (lang === "sql") {
    return html.replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INTO|VALUES|SET|AS|AND|OR|NOT|IN|LIKE|BETWEEN|NULL|IS|COUNT|SUM|AVG|MAX|MIN|DISTINCT|LIMIT|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT)\b/gi,
      '<span class="tok-kw">$1</span>');
  }
  return html;
}

function copyCode(id, btn) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      btn.classList.remove("copied");
    }, 2000);
  });
}

/* ── MESSAGE RENDERING ── */
function now() {
  return new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function addMessage(role, rawText) {
  const wrap  = document.getElementById("messagesWrap");
  const group = document.createElement("div");
  group.className = `msg-group ${role}`;

  const av = document.createElement("div");
  av.className   = `msg-av ${role}`;
  av.textContent = role === "bot" ? "IM" : (STUDENT_ROLL.slice(0, 2) || "ME");

  const col    = document.createElement("div");
  col.className = "msg-col";

  const sender    = document.createElement("div");
  sender.className   = "msg-sender";
  sender.textContent = role === "bot" ? "IntelliMind" : (STUDENT_ROLL || "You");

  const bubble    = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = role === "bot"
    ? renderMarkdown(rawText)
    : "<p>" + esc(rawText).replace(/\n/g, "<br>") + "</p>";

  const time    = document.createElement("div");
  time.className   = "msg-time";
  time.textContent = now();

  col.appendChild(sender);
  col.appendChild(bubble);
  col.appendChild(time);
  group.appendChild(av);
  group.appendChild(col);
  wrap.appendChild(group);
  scrollBottom();
}

function scrollBottom() {
  const ca = document.getElementById("chatArea");
  setTimeout(() => { ca.scrollTop = ca.scrollHeight; }, 60);
}

function showTyping(on) {
  document.getElementById("typingRow").classList.toggle("visible", on);
  if (on) scrollBottom();
}

function startChat() {
  if (!chatStarted) {
    document.getElementById("welcomeScreen").style.display = "none";
    document.getElementById("dateSep").style.display       = "";
    document.getElementById("messagesWrap").classList.add("visible");
    chatStarted = true;
  }
}

/* ── SEND MESSAGE ── */
async function sendMessage() {
  if (isWaiting) return;
  const input = document.getElementById("chatInput");
  const msg   = input.value.trim();
  if (!msg) return;

  startChat();
  addMessage("user", msg);
  input.value        = "";
  input.style.height = "auto";
  document.getElementById("sendBtn").disabled = true;
  isWaiting = true;
  showTyping(true);

  try {
    const reply = await callGemini(msg);
    showTyping(false);
    addMessage("bot", reply);
    chatHistory.push({ role:"user",      content: msg });
    chatHistory.push({ role:"assistant", content: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch (err) {
    showTyping(false);
    addMessage("bot", `**Error** — ${err.message}\n\nMake sure the backend is running:\n\`\`\`bash\ncd backend\nuvicorn main:app --reload\n\`\`\``);
  }

  isWaiting = false;
}

function sendChip(chip) {
  const text = chip.querySelector("strong").textContent;
  setInput(text);
  sendMessage();
}

function setInput(text) {
  const input = document.getElementById("chatInput");
  input.value = text;
  input.focus();
  autoResize(input);
  document.getElementById("sendBtn").disabled = false;
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 130) + "px";
  document.getElementById("sendBtn").disabled = el.value.trim().length === 0 || isWaiting;
}

function resetChat() {
  chatStarted = false; chatHistory = []; isWaiting = false;
  document.getElementById("messagesWrap").innerHTML = "";
  document.getElementById("messagesWrap").classList.remove("visible");
  document.getElementById("welcomeScreen").style.display = "";
  document.getElementById("dateSep").style.display       = "none";
  document.getElementById("chatInput").value             = "";
  document.getElementById("chatInput").style.height      = "auto";
  showTyping(false);
  document.getElementById("sendBtn").disabled = true;
}

document.getElementById("chatInput").addEventListener("input", function () {
  document.getElementById("sendBtn").disabled = this.value.trim().length === 0 || isWaiting;
});
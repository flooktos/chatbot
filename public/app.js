const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const status = document.querySelector("#status");
const versionEl = document.querySelector("#version");
const themeToggle = document.querySelector("#theme-toggle");
const quickReplies = document.querySelector("#quick-replies");
const sessionId = getOrCreateSessionId();

const DEFAULT_SUGGESTIONS = [
  "สมัครยังไง",
  "ใช้เอกสารอะไรบ้าง",
  "มีผลิตภัณฑ์อะไรบ้าง",
  "ชำระเงินช่องทางไหนได้บ้าง"
];

let suggestSeq = 0;

initTheme();
fetchSuggestions();
fetchVersion();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = input.value.trim();
  if (!message) {
    return;
  }

  appendMessage(message, "user");
  input.value = "";
  setBusy(true);
  showTypingIndicator();

  try {
    const result = await sendMessage(message);
    hideTypingIndicator();
    appendMessage(result.response, "bot", result);
    status.textContent = "พร้อมใช้งาน";
    status.classList.remove("error");
    fetchSuggestions();
  } catch (error) {
    hideTypingIndicator();
    appendMessage("ขออภัย ระบบไม่สามารถตอบกลับได้ในขณะนี้ครับ", "bot");
    status.textContent = "เชื่อมต่อไม่สำเร็จ";
    status.classList.add("error");
  } finally {
    setBusy(false);
    input.focus();
  }
});

themeToggle.addEventListener("click", toggleTheme);

async function sendMessage(message) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: sessionId,
      message
    })
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json();
}

function appendMessage(text, sender, result = null) {
  const article = document.createElement("article");
  article.className = `message ${sender}`;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  article.append(paragraph);

  if (result?.type) {
    const meta = document.createElement("p");
    meta.className = "message meta";
    meta.textContent = `ประเภท: ${result.type}${result.intent ? ` · intent: ${result.intent}` : ""}`;
    article.append(meta);
  }

  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
}

function setBusy(isBusy) {
  input.disabled = isBusy;
  form.querySelector("button").disabled = isBusy;
  status.textContent = isBusy ? "กำลังค้นหาคำตอบ..." : "พร้อมใช้งาน";
}

function showTypingIndicator() {
  const article = document.createElement("article");
  article.className = "message bot";
  article.id = "typing-indicator";
  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.innerHTML = "<span></span><span></span><span></span>";
  article.append(indicator);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
}

function hideTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function getOrCreateSessionId() {
  const key = "faq_chatbot_session_id";
  const existing = localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const created = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, created);
  return created;
}

async function fetchVersion() {
  try {
    const response = await fetch("/health");
    const data = await response.json();
    versionEl.textContent = `v${data.version}`;
  } catch {
    versionEl.textContent = "v?";
  }
}

async function fetchSuggestions() {
  const seq = ++suggestSeq;
  try {
    const response = await fetch(`/suggestions?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();
    if (seq === suggestSeq) {
      renderQuickReplies(data.suggestions || DEFAULT_SUGGESTIONS);
    }
  } catch {
    if (seq === suggestSeq) {
      renderQuickReplies(DEFAULT_SUGGESTIONS);
    }
  }
}

function renderQuickReplies(suggestions) {
  quickReplies.innerHTML = "";
  for (const text of suggestions) {
    const btn = document.createElement("button");
    btn.className = "quick-reply";
    btn.textContent = text;
    btn.addEventListener("click", () => {
      input.value = text;
      form.requestSubmit();
    });
    quickReplies.append(btn);
  }
}

function initTheme() {
  const saved = localStorage.getItem("faq_chatbot_theme");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggle.textContent = "☀️";
  } else {
    themeToggle.textContent = "🌙";
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  if (isDark) {
    html.removeAttribute("data-theme");
    localStorage.setItem("faq_chatbot_theme", "light");
    themeToggle.textContent = "🌙";
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("faq_chatbot_theme", "dark");
    themeToggle.textContent = "☀️";
  }
}

const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const status = document.querySelector("#status");

const versionEl = document.querySelector("#version");
const sessionId = getOrCreateSessionId();

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

  try {
    const result = await sendMessage(message);
    appendMessage(result.response, "bot", result);
    status.textContent = "พร้อมใช้งาน";
    status.classList.remove("error");
  } catch (error) {
    appendMessage("ขออภัย ระบบไม่สามารถตอบกลับได้ในขณะนี้ครับ", "bot");
    status.textContent = "เชื่อมต่อไม่สำเร็จ";
    status.classList.add("error");
  } finally {
    setBusy(false);
    input.focus();
  }
});

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

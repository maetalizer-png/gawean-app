import { initLLM, askLLM, getStatus, resetChat, hasWebGPU } from "./llm-engine.js";

const $ = (id) => document.getElementById(id);

const boot = $("boot");
const bootFill = $("boot-fill");
const bootPct = $("boot-pct");
const bootText = $("boot-text");
const bootError = $("boot-error");
const bootRetry = $("boot-retry");
const app = $("app");
const messagesEl = $("messages");
const input = $("chat-input");
const sendBtn = $("btn-send");
const composer = $("composer");

function setComposerEnabled(on) {
  input.disabled = !on;
  sendBtn.disabled = !on;
  composer.classList.toggle("disabled", !on);
}

function showBoot() {
  boot.hidden = false;
  app.hidden = true;
  setComposerEnabled(false);
}

function showApp() {
  boot.hidden = true;
  app.hidden = false;
  setComposerEnabled(true);
  input.focus();
}

function setProgress(percent, text) {
  const pct = percent == null ? null : Math.max(0, Math.min(100, percent));
  if (pct != null) {
    bootFill.style.width = pct + "%";
    bootPct.textContent = pct + "%";
  } else {
    bootPct.textContent = "…";
  }
  bootText.textContent = text || "Menyiapkan mesin…";
}

function setFatal(message) {
  bootError.hidden = false;
  bootError.textContent = message;
  bootRetry.hidden = false;
  bootFill.style.width = "0%";
  bootPct.textContent = "";
  bootText.textContent = "Gagal memuat model";
}

function addBubble(role, text, extraClass) {
  const el = document.createElement("div");
  el.className = "msg " + role + (extraClass ? " " + extraClass : "");
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

async function bootEngine() {
  showBoot();
  bootError.hidden = true;
  bootRetry.hidden = true;
  setProgress(0, "Mengunduh Qwen 4B (±2.5 GB)…");

  if (!hasWebGPU()) {
    setFatal("Browser tidak support WebGPU. Gunakan Chrome atau Edge versi terbaru.");
    return;
  }

  try {
    await initLLM(({ percent, text }) => {
      const label =
        percent != null && percent < 100
          ? "Mengunduh Qwen 4B (±2.5 GB)… " + percent + "%"
          : text || "Menyiapkan mesin…";
      setProgress(percent, label);
    });
    setProgress(100, "SIAP — Qwen 4B lokal aktif");
    showApp();
    if (!messagesEl.dataset.greeted) {
      addBubble("ai", "Gawean siap. Tanya apa saja — jawaban dari Qwen 4B di perangkat ini.");
      messagesEl.dataset.greeted = "1";
    }
  } catch (err) {
    const msg = err?.message || String(err);
    setFatal(msg);
  }
}

async function send() {
  const q = input.value.trim();
  if (!q) return;
  if (!getStatus().ready) return;

  input.value = "";
  addBubble("user", q);
  setComposerEnabled(false);

  const typing = addBubble("ai", "mengetik…", "typing");

  try {
    const answer = await askLLM(q, (partial) => {
      typing.classList.remove("typing");
      typing.textContent = partial;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
    typing.classList.remove("typing");
    typing.textContent = answer || "(kosong)";
  } catch (err) {
    console.error("[RATEGOAN-LLM]", err);
    typing.classList.remove("typing");
    typing.classList.add("error");
    typing.textContent = "Mesin lokal error. Coba ulangi pertanyaan.";
  } finally {
    setComposerEnabled(true);
    input.focus();
  }
}

sendBtn.addEventListener("click", send);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
bootRetry.addEventListener("click", () => bootEngine());

$("btn-clear")?.addEventListener("click", () => {
  resetChat();
  messagesEl.innerHTML = "";
  delete messagesEl.dataset.greeted;
  addBubble("ai", "Riwayat di perangkat ini dikosongkan. Tanya lagi.");
});

bootEngine();

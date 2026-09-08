import {
  initLLM,
  askLLM,
  getStatus,
  resetChat,
  hasWebGPU,
  listGemmaModels,
  formatBadge,
  resolveModelId,
} from "./llm-engine.js";

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
const badge = $("model-badge");
const picker = $("model-picker");
const pickerBtn = $("btn-models");
const pickerList = $("model-list");
const pickerClose = $("model-close");

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

function fillPicker(activeId) {
  const models = listGemmaModels();
  pickerList.innerHTML = "";
  if (!models.length) {
    pickerList.innerHTML = "<p class=\"set-empty\">Katalog Gemma kosong.</p>";
    return;
  }
  models.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "model-item" + (m.model_id === activeId ? " active" : "");
    const title = document.createElement("span");
    title.textContent = formatBadge(m.model_id).replace(" • OFFLINE", "");
    const small = document.createElement("small");
    small.textContent = m.model_id;
    btn.appendChild(title);
    btn.appendChild(small);
    btn.onclick = () => {
      picker.hidden = true;
      bootEngine(m.model_id);
    };
    pickerList.appendChild(btn);
  });
}

function addBubble(role, text, extraClass) {
  const el = document.createElement("div");
  el.className = "msg " + role + (extraClass ? " " + extraClass : "");
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

async function bootEngine(preferredId) {
  showBoot();
  bootError.hidden = true;
  bootRetry.hidden = true;
  picker.hidden = true;
  setProgress(0, "Menyiapkan katalog Gemma…");
  badge.textContent = "GEMMA • OFFLINE";

  if (!hasWebGPU()) {
    setFatal("Browser tidak support WebGPU. Gunakan Chrome atau Edge versi terbaru.");
    return;
  }

  try {
    const chosen = await resolveModelId(preferredId);
    setProgress(0, "Mengunduh " + (chosen || "Gemma") + "…");
    await initLLM(({ percent, text, model }) => {
      const label =
        percent != null && percent < 100
          ? "Mengunduh " + (model || "Gemma") + "… " + percent + "%"
          : text || "Menyiapkan mesin…";
      setProgress(percent, label);
      if (model) badge.textContent = formatBadge(model);
    }, preferredId);
    const st = getStatus();
    badge.textContent = st.badge;
    fillPicker(st.model);
    setProgress(100, "SIAP — " + st.badge);
    showApp();
    addBubble("ai", "Mesin aktif (" + st.model + "). Tanya apa saja.");
  } catch (err) {
    setFatal(err?.message || String(err));
    fillPicker("");
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
pickerBtn.addEventListener("click", () => {
  fillPicker(getStatus().model);
  picker.hidden = !picker.hidden;
});
pickerClose.addEventListener("click", () => {
  picker.hidden = true;
});
$("btn-clear").addEventListener("click", () => {
  resetChat();
  messagesEl.innerHTML = "";
  addBubble("ai", "Riwayat dikosongkan. Tanya lagi.");
});

function landOnChat() {
  showApp();
  setComposerEnabled(false);
  badge.textContent = "MESIN BELUM AKTIF";
  addBubble("ai", "Gawean siap dipakai. Mesin AI belum diunduh. Tekan Aktifkan Mesin kalau sudah siap.");
}

$("btn-activate").addEventListener("click", () => bootEngine());
landOnChat();

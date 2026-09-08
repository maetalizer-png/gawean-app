const WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";
const SYSTEM_PROMPT =
  "Kamu adalah Gawean, asisten AI berbahasa Indonesia. Jawab singkat, jelas, dan jujur. Jika tidak tahu, katakan tidak tahu. Jangan mengarang fakta.";
const LOG = "[RATEGOAN-LLM]";
const STORE_KEY = "gawean-model-id";

const MOBILE_PRIORITY = [
  "gemma-3n-e4b-it-q4f16_1-MLC",
  "gemma-3n-e2b-it-q4f16_1-MLC",
  "gemma-3-4b-it-q4f16_1-MLC",
  "gemma-2-2b-it-q4f16_1-MLC",
];

const DESKTOP_PRIORITY = [
  "gemma-3-4b-it-q4f16_1-MLC",
  "gemma-3n-e4b-it-q4f16_1-MLC",
  "gemma-2-2b-it-q4f16_1-MLC",
];

let webllm = null;
let engine = null;
let status = "idle";
let lastError = "";
let activeModelId = "";
let catalog = [];
let messages = [{ role: "system", content: SYSTEM_PROMPT }];

function log(...args) {
  console.log(LOG, ...args);
}

function errorLog(...args) {
  console.error(LOG, ...args);
}

export function isMobile() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints > 1;
  const narrow = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(max-width: 820px)").matches
    : false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (touch && narrow);
}

export function hasWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

export function formatBadge(modelId) {
  if (!modelId) return "GEMMA • OFFLINE";
  const core = modelId
    .replace(/-MLC$/i, "")
    .replace(/-q4f\d+_\d+(-1k)?$/i, "")
    .replace(/-it$/i, "")
    .replace(/-/g, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  return core + " • OFFLINE";
}

function sizeHint(rec) {
  const vram = Number(rec?.vram_required_MB);
  if (Number.isFinite(vram) && vram > 0) return vram;
  const id = rec?.model_id || "";
  const m = id.match(/(\d+(?:\.\d+)?)b/i);
  if (m) return parseFloat(m[1]) * 1000;
  if (/e2b/i.test(id)) return 2000;
  if (/e4b/i.test(id)) return 4000;
  return 99999;
}

export function listGemmaModels() {
  return catalog
    .filter((m) => /gemma/i.test(m.model_id || ""))
    .slice()
    .sort((a, b) => sizeHint(a) - sizeHint(b));
}

export function pickDefaultModel(list) {
  const ids = new Set((list || []).map((m) => m.model_id));
  const order = isMobile() ? MOBILE_PRIORITY : DESKTOP_PRIORITY;
  for (const id of order) {
    if (ids.has(id)) return id;
  }
  const gemma = listGemmaModels();
  if (gemma.length) return gemma[0].model_id;
  return "";
}

export function getSavedModelId() {
  try {
    return localStorage.getItem(STORE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveModelId(id) {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {}
}

export function getStatus() {
  return {
    status,
    lastError,
    model: activeModelId,
    badge: formatBadge(activeModelId),
    ready: status === "ready",
    mobile: isMobile(),
    catalog: listGemmaModels().map((m) => m.model_id),
  };
}

async function loadWebLLM() {
  if (webllm) return webllm;
  log("Import WebLLM from", WEBLLM_CDN);
  webllm = await import(WEBLLM_CDN);
  catalog = webllm.prebuiltAppConfig?.model_list || [];
  log("catalog size", catalog.length, "gemma", listGemmaModels().length);
  return webllm;
}

export async function resolveModelId(preferred) {
  await loadWebLLM();
  const gemma = listGemmaModels();
  const ids = new Set(gemma.map((m) => m.model_id));
  if (preferred && ids.has(preferred)) return preferred;
  const saved = getSavedModelId();
  if (saved && ids.has(saved)) return saved;
  return pickDefaultModel(gemma);
}

export async function initLLM(onProgress, preferredId) {
  status = "loading";
  lastError = "";
  engine = null;
  activeModelId = "";

  if (!hasWebGPU()) {
    lastError =
      "Browser tidak support WebGPU. Gunakan Chrome atau Edge versi terbaru.";
    status = "error";
    errorLog("WebGPU unavailable");
    throw new Error(lastError);
  }

  try {
    const mod = await loadWebLLM();
    const modelId = await resolveModelId(preferredId);
    if (!modelId) {
      throw new Error("Tidak ada model Gemma di katalog WebLLM.");
    }
    activeModelId = modelId;
    saveModelId(modelId);
    log("Load model", modelId, isMobile() ? "(mobile)" : "(desktop)");

    engine = await mod.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        const pct =
          typeof report?.progress === "number"
            ? Math.round(report.progress * 100)
            : null;
        const text = report?.text || "Menyiapkan mesin…";
        log("progress", pct, text);
        if (typeof onProgress === "function") {
          onProgress({ percent: pct, text, model: modelId });
        }
      },
    });

    messages = [{ role: "system", content: SYSTEM_PROMPT }];
    status = "ready";
    log("Engine ready", modelId);
    return getStatus();
  } catch (err) {
    lastError = err?.message || String(err);
    status = "error";
    engine = null;
    errorLog("init failed", err);
    throw err;
  }
}

export async function askLLM(question, onDelta) {
  if (status !== "ready" || !engine) {
    const err = new Error(lastError || "Mesin belum siap.");
    errorLog("ask rejected", err.message);
    throw err;
  }

  const q = String(question || "").trim();
  if (!q) throw new Error("Pertanyaan kosong.");

  messages.push({ role: "user", content: q });

  try {
    const stream = typeof onDelta === "function";
    const reply = await engine.chat.completions.create({
      messages,
      stream,
      temperature: 0.7,
    });

    let text = "";
    if (stream) {
      for await (const chunk of reply) {
        const piece = chunk?.choices?.[0]?.delta?.content || "";
        if (piece) {
          text += piece;
          onDelta(text);
        }
      }
    } else {
      text = reply?.choices?.[0]?.message?.content || "";
    }

    messages.push({ role: "assistant", content: text });
    log("reply length", text.length);
    return text;
  } catch (err) {
    errorLog("generate failed", err);
    messages.pop();
    throw err;
  }
}

export function resetChat() {
  messages = [{ role: "system", content: SYSTEM_PROMPT }];
  log("history reset");
}

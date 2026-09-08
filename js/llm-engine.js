const WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";
const SYSTEM_PROMPT =
  "Kamu adalah Gawean, asisten AI berbahasa Indonesia. Jawab singkat, jelas, dan jujur. Jika tidak tahu, katakan tidak tahu. Jangan mengarang fakta.";
const LOG = "[RATEGOAN-LLM]";
const STORE_KEY = "gawean-model-id";

const F16_MOBILE = [
  "gemma-3n-e4b-it-q4f16_1-MLC",
  "gemma-3n-e2b-it-q4f16_1-MLC",
  "gemma-3-4b-it-q4f16_1-MLC",
  "gemma-2-2b-it-q4f16_1-MLC",
];

const F16_DESKTOP = [
  "gemma-3-4b-it-q4f16_1-MLC",
  "gemma-3n-e4b-it-q4f16_1-MLC",
  "gemma-2-2b-it-q4f16_1-MLC",
];

const F32_PRIORITY = [
  "gemma-2-2b-it-q4f32_1-MLC",
  "gemma-3n-e2b-it-q4f32_1-MLC",
  "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
];

let webllm = null;
let engine = null;
let status = "idle";
let lastError = "";
let activeModelId = "";
let catalog = [];
let hasF16 = null;
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

export function quantOf(id) {
  if (/q4f32/i.test(id || "")) return "f32";
  if (/q4f16/i.test(id || "")) return "f16";
  return "";
}

export function formatBadge(modelId) {
  if (!modelId) return "GEMMA • OFFLINE";
  const q = quantOf(modelId);
  const core = modelId
    .replace(/-MLC$/i, "")
    .replace(/-q4f\d+_\d+(-1k)?$/i, "")
    .replace(/-it$/i, "")
    .replace(/-/g, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  return core + (q ? " (" + q + ")" : "") + " • OFFLINE";
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

export async function detectF16() {
  if (hasF16 !== null) return hasF16;
  if (!hasWebGPU()) {
    hasF16 = false;
    log("shader-f16: tidak (tidak ada WebGPU)");
    return hasF16;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    hasF16 = !!adapter && adapter.features.has("shader-f16");
    log("shader-f16:", hasF16 ? "ada" : "tidak");
  } catch (err) {
    hasF16 = false;
    errorLog("adapter check failed", err);
    log("shader-f16: tidak");
  }
  return hasF16;
}

export function listCompatibleModels() {
  const f16 = hasF16 === true;
  return catalog
    .filter((m) => {
      const id = m.model_id || "";
      if (!f16) return /q4f32_1-MLC$/i.test(id);
      return /gemma/i.test(id);
    })
    .slice()
    .sort((a, b) => sizeHint(a) - sizeHint(b));
}

export function listGemmaModels() {
  return listCompatibleModels();
}

function firstExisting(ids, pool) {
  const set = new Set(pool.map((m) => m.model_id));
  for (const id of ids) {
    if (set.has(id)) return id;
  }
  return "";
}

function smallest(pool, regex) {
  const hit = pool.filter((m) => regex.test(m.model_id || "")).sort((a, b) => sizeHint(a) - sizeHint(b));
  return hit[0]?.model_id || "";
}

export function pickDefaultModel() {
  const all = catalog;
  if (hasF16 === false) {
    const f32 = all.filter((m) => /q4f32_1-MLC$/i.test(m.model_id || ""));
    let id = firstExisting(F32_PRIORITY, f32);
    if (!id) id = smallest(f32, /gemma.*q4f32/i);
    if (!id) id = smallest(f32, /q4f32/i);
    return id;
  }
  const gemma = all.filter((m) => /gemma/i.test(m.model_id || ""));
  const order = isMobile() ? F16_MOBILE : F16_DESKTOP;
  let id = firstExisting(order, gemma);
  if (!id) id = smallest(gemma, /gemma/i);
  return id;
}

export function availableIdsMessage() {
  const ids = catalog.map((m) => m.model_id).filter(Boolean);
  const f32 = ids.filter((id) => /q4f32_1-MLC$/i.test(id));
  const head = f32.length ? f32.slice(0, 12).join(", ") : ids.slice(0, 12).join(", ");
  return "Model f32 tidak tersedia di katalog perangkat ini. Tersedia: " + (head || "(kosong)");
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
    hasF16,
    catalog: listCompatibleModels().map((m) => m.model_id),
  };
}

async function loadWebLLM() {
  if (webllm) return webllm;
  log("Import WebLLM from", WEBLLM_CDN);
  webllm = await import(WEBLLM_CDN);
  catalog = webllm.prebuiltAppConfig?.model_list || [];
  log("catalog size", catalog.length);
  return webllm;
}

export async function resolveModelId(preferred) {
  await detectF16();
  await loadWebLLM();
  const allowed = new Set(listCompatibleModels().map((m) => m.model_id));
  if (preferred && allowed.has(preferred)) return preferred;
  const saved = getSavedModelId();
  if (saved && allowed.has(saved)) return saved;
  return pickDefaultModel();
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
    await detectF16();
    const modelId = await resolveModelId(preferredId);
    if (!modelId) {
      throw new Error(availableIdsMessage());
    }
    activeModelId = modelId;
    saveModelId(modelId);
    log("Load model", modelId, "f16=" + hasF16, isMobile() ? "(mobile)" : "(desktop)");

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

const MODEL_ID = "Qwen3-4B-q4f16_1-MLC";
const WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";
const SYSTEM_PROMPT =
  "Kamu adalah Gawean, asisten AI cerdas. Jawab padat dan jelas.";
const LOG = "[RATEGOAN-LLM]";

let engine = null;
let status = "idle";
let lastError = "";
let messages = [{ role: "system", content: SYSTEM_PROMPT }];

function log(...args) {
  console.log(LOG, ...args);
}

function errorLog(...args) {
  console.error(LOG, ...args);
}

export function getStatus() {
  return {
    status,
    lastError,
    model: MODEL_ID,
    ready: status === "ready",
    historyLength: messages.length,
  };
}

export function hasWebGPU() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

export async function initLLM(onProgress) {
  status = "loading";
  lastError = "";
  engine = null;

  if (!hasWebGPU()) {
    lastError =
      "Browser tidak support WebGPU. Gunakan Chrome atau Edge versi terbaru.";
    status = "error";
    errorLog("WebGPU unavailable");
    throw new Error(lastError);
  }

  try {
    log("Import WebLLM from", WEBLLM_CDN);
    const webllm = await import(WEBLLM_CDN);
    const { CreateMLCEngine } = webllm;

    log("Load model", MODEL_ID);
    engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        const pct =
          typeof report?.progress === "number"
            ? Math.round(report.progress * 100)
            : null;
        const text = report?.text || "Menyiapkan mesin…";
        log("progress", pct, text);
        if (typeof onProgress === "function") onProgress({ percent: pct, text });
      },
    });

    messages = [{ role: "system", content: SYSTEM_PROMPT }];
    status = "ready";
    log("Engine ready");
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

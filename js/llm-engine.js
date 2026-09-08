const KEY = "gawean-model";
const CDN = "https://esm.run/@mlc-ai/web-llm";
const ONLY = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";
const SYSTEM =
  "Kamu asisten Indonesia bernama Gawean. Jawab singkat, jujur, dan jelas. Jangan mengarang fakta. Jika tidak tahu, bilang tidak tahu.";

let webllm = null;
let catalog = [];
let engine = null;
let activeId = "";
let loading = null;
let busy = null;

function inCatalog(id) {
  return catalog.some((m) => (m.model_id || "") === id);
}

function pickOne() {
  if (inCatalog(ONLY)) return ONLY;
  const hit = catalog.find((m) => /qwen2\.5-0\.5b-instruct-q4f32_1/i.test(m.model_id || ""));
  return hit ? hit.model_id : "";
}

function isGpuFault(err) {
  const msg = String((err && err.message) || err || "");
  return /GPUBuffer|mapAsync|ShaderModule|Device lost|WebGPU|unmapped/i.test(msg);
}

async function createEngine(onProgress) {
  const report = (info) => {
    const pct = info && typeof info.progress === "number" ? Math.round(info.progress * 100) : 0;
    const text = (info && info.text) || "Menyiapkan mesin…";
    if (onProgress) onProgress(pct, text);
  };
  return webllm.CreateMLCEngine(
    activeId,
    { initProgressCallback: report },
    { context_window_size: 512, prefill_chunk_size: 128 }
  );
}

async function generateOnce(messages) {
  const out = await engine.chat.completions.create({
    messages,
    stream: false,
    temperature: 0.6,
    max_tokens: 96,
  });
  return ((((out.choices || [])[0] || {}).message || {}).content || "").trim();
}

export const llm = {
  ready() {
    return !!engine;
  },
  activeId() {
    return activeId;
  },
  badge() {
    return engine ? "QWEN 2.5 0.5B • OFFLINE" : "QWEN 2.5 0.5B";
  },
  listPicker() {
    return activeId ? [{ id: activeId, label: "QWEN 2.5 0.5B", active: true }] : [];
  },
  async prepare() {
    if (webllm && activeId) return activeId;
    try {
      localStorage.removeItem(KEY);
    } catch {}
    if (!navigator.gpu) throw new Error("HP ini tidak punya WebGPU. Pakai Chrome terbaru.");
    webllm = await import(CDN);
    catalog = (webllm.prebuiltAppConfig && webllm.prebuiltAppConfig.model_list) || [];
    activeId = pickOne();
    if (!activeId) throw new Error("Qwen 2.5 0.5B f32 tidak ada di katalog");
    console.log("[GAWEAN-LLM] only", activeId);
    try {
      localStorage.setItem(KEY, activeId);
    } catch {}
    return activeId;
  },
  choose(id) {
    return activeId;
  },
  async ensure(onProgress) {
    if (engine) return engine;
    if (loading) return loading;
    loading = (async () => {
      try {
        await llm.prepare();
        engine = await createEngine(onProgress);
        return engine;
      } catch (err) {
        engine = null;
        throw err;
      } finally {
        loading = null;
      }
    })();
    return loading;
  },
  async reply(history) {
    if (busy) return busy;
    busy = (async () => {
      try {
        await llm.ensure();
        const messages = [{ role: "system", content: SYSTEM }].concat((history || []).slice(-4));
        try {
          return await generateOnce(messages);
        } catch (err) {
          if (!isGpuFault(err)) throw err;
          console.warn("[GAWEAN-LLM] retry after GPU fault", err);
          try {
            if (engine && engine.unload) await engine.unload();
          } catch {}
          engine = null;
          await new Promise((r) => setTimeout(r, 400));
          engine = await createEngine();
          return await generateOnce(messages);
        }
      } finally {
        busy = null;
      }
    })();
    return busy;
  },
};

const KEY = "gawean-model";
const CDN = "https://esm.run/@mlc-ai/web-llm";

const SYSTEM =
  "Kamu asisten Indonesia bernama Gawean. Jawab singkat, jujur, dan jelas. Jangan mengarang fakta. Jika tidak tahu, bilang tidak tahu.";

const ONLY = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";

let webllm = null;
let catalog = [];
let engine = null;
let activeId = "";
let loading = null;

function inCatalog(id) {
  return catalog.some((m) => (m.model_id || "") === id);
}

function pickOne() {
  if (inCatalog(ONLY)) return ONLY;
  const f32 = catalog.filter((m) => /qwen2\.5-0\.5b.*q4f32/i.test(m.model_id || ""));
  if (f32[0]) return f32[0].model_id;
  const small = catalog.filter((m) => /qwen.*0\.5b.*q4f32/i.test(m.model_id || ""));
  if (small[0]) return small[0].model_id;
  return "";
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
    if (!activeId) return [];
    return [{ id: activeId, label: "QWEN 2.5 0.5B", active: true }];
  },
  async prepare() {
    if (webllm && activeId) return activeId;
    try {
      localStorage.removeItem(KEY);
    } catch {}
    if (!navigator.gpu) {
      console.warn("[GAWEAN-LLM] WebGPU tidak ada");
      return "";
    }
    webllm = await import(CDN);
    catalog = (webllm.prebuiltAppConfig && webllm.prebuiltAppConfig.model_list) || [];
    activeId = pickOne();
    console.log("[GAWEAN-LLM] only", activeId);
    try {
      localStorage.setItem(KEY, activeId);
    } catch {}
    return activeId;
  },
  choose(id) {
    if (id && inCatalog(id) && /q4f32/i.test(id)) activeId = id;
    return activeId;
  },
  async ensure(onProgress) {
    if (engine) return engine;
    if (loading) return loading;
    await llm.prepare();
    if (!activeId) throw new Error("Model Qwen 2.5 0.5B (f32) tidak ada di katalog");
    loading = (async () => {
      try {
        const report = (info) => {
          const pct = info && typeof info.progress === "number" ? Math.round(info.progress * 100) : 0;
          const text = (info && info.text) || "Menyiapkan mesin…";
          if (onProgress) onProgress(pct, text);
        };
        engine = await webllm.CreateMLCEngine(activeId, { initProgressCallback: report });
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
  async reply(history, onDelta) {
    const inst = await llm.ensure();
    const messages = [{ role: "system", content: SYSTEM }].concat(history || []);
    const stream = await inst.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 256,
    });
    let out = "";
    for await (const chunk of stream) {
      const piece = (((chunk.choices || [])[0] || {}).delta || {}).content || "";
      if (!piece) continue;
      out += piece;
      if (onDelta) onDelta(out);
    }
    return out.trim();
  },
};

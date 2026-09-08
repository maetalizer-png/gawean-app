const KEY = "gawean-model";
const CDN = "https://esm.run/@mlc-ai/web-llm";

const SYSTEM =
  "Kamu asisten Indonesia bernama Gawean. Jawab singkat, jujur, dan jelas. Jangan mengarang fakta. Jika tidak tahu, bilang tidak tahu.";

const F16 = [
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  "Qwen2-0.5B-Instruct-q4f16_1-MLC",
];
const F32 = [
  "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
  "Qwen2-0.5B-Instruct-q4f32_1-MLC",
];

let webllm = null;
let catalog = [];
let hasF16 = false;
let engine = null;
let activeId = "";
let loading = false;

function inCatalog(id) {
  return catalog.some((m) => (m.model_id || "") === id);
}

function smallest(re) {
  const hits = catalog.filter((m) => re.test(m.model_id || ""));
  hits.sort((a, b) => String(a.model_id).length - String(b.model_id).length);
  return hits[0] ? hits[0].model_id : "";
}

function pickDefault() {
  const saved = localStorage.getItem(KEY) || "";
  if (saved && inCatalog(saved)) {
    if (!hasF16 && /q4f16/i.test(saved)) {
      /* skip saved f16 on phones without shader-f16 */
    } else return saved;
  }
  const order = hasF16 ? F16.concat(F32) : F32.slice();
  for (const id of order) if (inCatalog(id)) return id;
  return (
    smallest(/qwen2\.5-0\.5b.*q4f32/i) ||
    smallest(/qwen2\.5-0\.5b/i) ||
    smallest(/qwen2-0\.5b.*q4f32/i) ||
    smallest(/qwen.*0\.5b/i) ||
    smallest(/qwen/i) ||
    (catalog[0] && catalog[0].model_id) ||
    ""
  );
}

function labelOf(id) {
  if (!id) return "Belum aktif";
  const f32 = /q4f32/i.test(id);
  if (/qwen2\.5-0\.5b/i.test(id)) return "QWEN 2.5 0.5B (" + (f32 ? "f32" : "f16") + ")";
  if (/qwen2-0\.5b/i.test(id)) return "QWEN 2 0.5B (" + (f32 ? "f32" : "f16") + ")";
  return id.replace(/-MLC$/, "").replace(/-Instruct/i, "");
}

export const llm = {
  hasF16() { return hasF16; },
  ready() { return !!engine; },
  loading() { return loading; },
  activeId() { return activeId; },
  badge() {
    if (!activeId) return "Mesin belum aktif";
    return labelOf(activeId) + (engine ? " • OFFLINE" : "");
  },
  catalog() { return catalog.slice(); },
  listPicker() {
    const prefer = catalog.filter((m) => /qwen.*0\.5b/i.test(m.model_id || ""));
    const rest = catalog.filter((m) => /qwen/i.test(m.model_id || "") && !prefer.includes(m));
    const rows = prefer.length ? prefer.concat(rest) : catalog.filter((m) => /qwen|gemma|llama-3\.2-1b/i.test(m.model_id || ""));
    return (rows.length ? rows : catalog).map((m) => ({
      id: m.model_id,
      label: labelOf(m.model_id),
      active: m.model_id === activeId,
    }));
  },
  async prepare() {
    if (webllm) return activeId;
    if (!navigator.gpu) {
      console.warn("[GAWEAN-LLM] WebGPU tidak ada");
      return "";
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      hasF16 = !!(adapter && adapter.features && adapter.features.has("shader-f16"));
      console.log("[GAWEAN-LLM] shader-f16:", hasF16 ? "ada" : "tidak");
    } catch (err) {
      hasF16 = false;
      console.warn("[GAWEAN-LLM] adapter gagal", err);
    }
    webllm = await import(CDN);
    catalog = (webllm.prebuiltAppConfig && webllm.prebuiltAppConfig.model_list) || [];
    console.log("[GAWEAN-LLM] katalog", catalog.length);
    activeId = pickDefault();
    console.log("[GAWEAN-LLM] default", activeId);
    return activeId;
  },
  choose(id) {
    if (!inCatalog(id)) return activeId;
    activeId = id;
    try { localStorage.setItem(KEY, id); } catch {}
    engine = null;
    return activeId;
  },
  async ensure(onProgress) {
    if (engine) return engine;
    if (loading) throw new Error("Mesin sedang disiapkan");
    await llm.prepare();
    if (!activeId) throw new Error("Tidak ada model Qwen di katalog");
    loading = true;
    try {
      const report = (info) => {
        const pct = info && typeof info.progress === "number" ? Math.round(info.progress * 100) : 0;
        const text = (info && info.text) || "Menyiapkan mesin…";
        if (onProgress) onProgress(pct, text);
      };
      engine = await webllm.CreateMLCEngine(activeId, { initProgressCallback: report });
      return engine;
    } finally {
      loading = false;
    }
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

const KEY = "gawean-model";
const CDN = "https://esm.run/@mlc-ai/web-llm";
const SYSTEM =
  "Kamu asisten Indonesia bernama Gawean. Jawab singkat, jujur, dan jelas. Jangan mengarang fakta. Jika tidak tahu, bilang tidak tahu.";

// Tangga model kecil -> besar. f16 hanya dipakai kalau GPU perangkat punya
// fitur "shader-f16" (dicek sekali lewat adapter.features sebelum katalog dibuka).
// SmolLM2 360M ditaruh paling depan karena beberapa HP Android budget punya
// batas GPU (maxStorageBufferBindingSize) yang sangat kecil (terlihat langsung
// di device: limit 512MB) -- bahkan Qwen 0.5B bisa bikin device lost di sana.
const LADDER = [
  { id: "SmolLM2-360M-Instruct-q4f32_1-MLC", label: "SmolLM2 360M", f16: false },
  { id: "SmolLM2-360M-Instruct-q4f16_1-MLC", label: "SmolLM2 360M (f16)", f16: true },
  { id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", label: "Qwen2.5 0.5B", f16: false },
  { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B (f16)", f16: true },
  { id: "Llama-3.2-1B-Instruct-q4f32_1-MLC", label: "Llama 3.2 1B", f16: false },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (f16)", f16: true },
  { id: "gemma-2-2b-it-q4f32_1-MLC", label: "Gemma 2 2B", f16: false },
  { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B (f16)", f16: true },
  { id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", label: "Qwen2.5 1.5B", f16: false },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B (f16)", f16: true },
  { id: "Qwen2.5-3B-Instruct-q4f32_1-MLC", label: "Qwen2.5 3B", f16: false },
  { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 Mini", f16: true },
];
const DEFAULT_ID = LADDER[0].id;

let webllm = null;
let catalog = [];
let supportsF16 = null;
let engine = null;
let engineForId = ""; // id model yang benar-benar sudah selesai dimuat & diuji oleh `engine`
let activeId = ""; // id model yang sedang dipilih (belum tentu sudah dimuat)
let loading = null;
let busy = Promise.resolve(); // rantai antrean balasan, biar pesan tidak saling serobot/ketuker

function inCatalog(id) {
  return catalog.length === 0 || catalog.some((m) => (m.model_id || "") === id);
}

async function detectF16() {
  if (supportsF16 !== null) return supportsF16;
  try {
    if (!navigator.gpu) {
      supportsF16 = false;
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    supportsF16 = !!(adapter && adapter.features && adapter.features.has("shader-f16"));
  } catch {
    supportsF16 = false;
  }
  return supportsF16;
}

function availableLadder() {
  return LADDER.filter((m) => (supportsF16 || !m.f16) && inCatalog(m.id));
}

function isGpuFault(err) {
  const msg = String((err && err.message) || err || "");
  return /GPUBuffer|mapAsync|ShaderModule|Device lost|WebGPU|unmapped|Instance reference|model not loaded|reload\(/i.test(msg);
}

async function loadWebllmOnce() {
  if (webllm) return webllm;
  if (!navigator.gpu) throw new Error("HP ini tidak punya WebGPU. Pakai Chrome terbaru.");
  webllm = await import(CDN);
  catalog = (webllm.prebuiltAppConfig && webllm.prebuiltAppConfig.model_list) || [];
  await detectF16();
  return webllm;
}

async function disposeEngine() {
  const old = engine;
  engine = null;
  engineForId = "";
  if (old) {
    try {
      await old.unload();
    } catch {}
  }
}

async function createEngine(id, onProgress) {
  const report = (info) => {
    const pct = info && typeof info.progress === "number" ? Math.round(info.progress * 100) : 0;
    const text = (info && info.text) || "Menyiapkan mesin…";
    if (onProgress) onProgress(pct, text);
  };
  // Konteks dijaga kecil (512) -- perangkat Android budget yang jadi target app
  // ini terbukti punya batas GPU (maxStorageBufferBindingSize) sekecil 512MB;
  // minta konteks lebih besar dari itu bikin buffer diminta > batas device dan
  // memicu VK_ERROR_DEVICE_LOST (device lost), bukan cuma lambat.
  const built = await webllm.CreateMLCEngine(
    id,
    { initProgressCallback: report },
    { context_window_size: 512, prefill_chunk_size: 128 }
  );
  // Uji jalan beneran sebelum dianggap "siap" -- ini yang mencegah pesan
  // "Gawean siap" palsu yang diikuti error "model not loaded" di pesan pertama.
  await built.chat.completions.create({
    messages: [{ role: "user", content: "hi" }],
    stream: false,
    max_tokens: 1,
    temperature: 0,
  });
  return built;
}

function generateOnce(messages) {
  return engine.chat.completions
    .create({ messages, stream: false, temperature: 0.6, max_tokens: 96 })
    .then((out) => ((((out.choices || [])[0] || {}).message || {}).content || "").trim());
}

export const llm = {
  ready() {
    return !!engine && engineForId === activeId;
  },
  activeId() {
    return activeId;
  },
  activeLabel() {
    const row = LADDER.find((m) => m.id === activeId);
    return row ? row.label : activeId || "Mesin AI";
  },
  badge() {
    const label = llm.activeLabel().toUpperCase();
    return llm.ready() ? label + " • OFFLINE" : label;
  },
  listPicker() {
    return availableLadder().map((m) => ({ id: m.id, label: m.label, active: m.id === activeId }));
  },
  async prepare() {
    await loadWebllmOnce();
    if (!activeId) {
      let saved = "";
      try {
        saved = localStorage.getItem(KEY) || "";
      } catch {}
      const rows = availableLadder();
      activeId = rows.some((m) => m.id === saved) ? saved : rows[0] ? rows[0].id : DEFAULT_ID;
    }
    return activeId;
  },
  async choose(id) {
    await loadWebllmOnce();
    if (id === activeId) return activeId;
    activeId = id;
    try {
      localStorage.setItem(KEY, id);
    } catch {}
    if (engineForId && engineForId !== id) await disposeEngine();
    return activeId;
  },
  async ensure(onProgress) {
    await llm.prepare();
    if (engine && engineForId === activeId) return engine;
    if (loading) return loading;
    const rows = availableLadder();
    if (!rows.length) throw new Error("Tidak ada model yang cocok untuk perangkat ini.");
    const startIdx = Math.max(
      0,
      rows.findIndex((m) => m.id === activeId)
    );
    loading = (async () => {
      let lastErr = null;
      // Coba model yang dipilih; kalau gagal karena batas GPU device (bukan
      // sekadar gagal jaringan), turun ke model yang lebih kecil di tangga --
      // ini yang membuat "cari model yang beneran jalan" otomatis di device.
      for (let i = startIdx; i >= 0; i--) {
        const candidate = rows[i];
        try {
          await disposeEngine();
          let built;
          try {
            built = await createEngine(candidate.id, onProgress);
          } catch (err) {
            if (!isGpuFault(err)) throw err;
            console.warn("[GAWEAN-LLM] retry load after GPU fault", err);
            await disposeEngine();
            await new Promise((r) => setTimeout(r, 400));
            built = await createEngine(candidate.id, onProgress);
          }
          engine = built;
          engineForId = candidate.id;
          activeId = candidate.id;
          try {
            localStorage.setItem(KEY, candidate.id);
          } catch {}
          return engine;
        } catch (err) {
          lastErr = err;
          await disposeEngine();
          if (!isGpuFault(err) || i === 0) throw err;
          if (onProgress) {
            onProgress(0, "Perangkat kesulitan menjalankan " + candidate.label + ", coba mesin lebih kecil…");
          }
        }
      }
      throw lastErr || new Error("Semua mesin gagal dimuat.");
    })();
    try {
      return await loading;
    } finally {
      loading = null;
    }
  },
  async reply(history) {
    const messages = [{ role: "system", content: SYSTEM }].concat((history || []).slice(-4));
    const run = async () => {
      await llm.ensure();
      try {
        return await generateOnce(messages);
      } catch (err) {
        if (!isGpuFault(err)) throw err;
        console.warn("[GAWEAN-LLM] retry after GPU fault", err);
        const id = activeId;
        await disposeEngine();
        await new Promise((r) => setTimeout(r, 400));
        engine = await createEngine(id);
        engineForId = id;
        return await generateOnce(messages);
      }
    };
    // Antre: setiap balasan menunggu balasan sebelumnya selesai (sukses atau
    // gagal) supaya dua pesan tidak pernah berebut GPU buffer yang sama, dan
    // jawaban tidak pernah ketuker pasangan pertanyaannya.
    const result = busy.then(run, run);
    busy = result.then(
      () => {},
      () => {}
    );
    return result;
  },
};

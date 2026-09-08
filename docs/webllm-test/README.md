# WebLLM model ladder — test notes

## TL;DR

The two bugs from the reports (`Failed to execute 'mapAsync' on 'GPUBuffer': A
valid external Instance reference no longer exists.` and `Model not loaded
before trying to complete ChatCompletionRequest`) are fixed in `js/llm-engine.js`.
The model picker is no longer locked to a single model — all 10 models in the
size ladder (0.5B → 3B, f32/f16) are selectable again, gated by real
`shader-f16` GPU-feature detection. Default stays the smallest model
(`Qwen2.5-0.5B-Instruct-q4f32_1-MLC`).

## Why this wasn't tested with real model downloads

This session's sandbox network policy allows GitHub and the npm registry, but
blocks every host WebLLM needs to actually run a model:
`esm.run`, `cdn.jsdelivr.net`, `unpkg.com`, `huggingface.co` and
`cdn-lfs.huggingface.co` all return `403` from the egress proxy (confirmed
with `curl` and via the proxy's own `recentRelayFailures` log). So no model
weights — not even the smallest 0.5B one — can be downloaded from inside this
container, on any network path.

What *does* work here, confirmed directly: headless Chromium (Playwright,
Chromium 141) gets a real `navigator.gpu` adapter via SwiftShader software
rendering when serving the app over `http://` (not `about:blank`). That
adapter does **not** report the `shader-f16` feature, which is exactly the
kind of device the picker's f16-gating exists for.

## What was actually verified

Since real weights are unreachable, the WebLLM CDN import
(`https://esm.run/@mlc-ai/web-llm`) was intercepted at the browser network
layer (Playwright `route.fulfill`) and replaced with a small stub that
implements the same `CreateMLCEngine` / `chat.completions.create` / `unload`
surface WebLLM exposes, with configurable latency and failure injection. The
real, unmodified app code (`js/llm-engine.js`, `js/ui/models.js`,
`js/ui/chat.js`) was driven end-to-end through the real UI (click picker →
activate → type → send) in a real browser with real WebGPU. This validates
the app's *logic* — picker, engine lifecycle, retry, message ordering — but
**not** real-model answer quality or real load times on device. That last
part needs a network that can reach Hugging Face, e.g. running the same
`index.html` on a normal machine or phone.

Results: `results.json` (raw Playwright run), screenshots below.

| Scenario | What it proves | Result |
|---|---|---|
| `s1-happy-path` | Default model (Qwen2.5 0.5B) loads, answers both questions in order | OK — see `01-happy-path-answers.png` |
| `s2a-gpu-fault-persistent` | The exact reported `mapAsync`/`Instance reference` error, injected on every load attempt: app retries once, then fails with a clear message instead of a false "siap" | OK — see `02-gpu-fault-clean-error.png` |
| `s2b-gpu-fault-transient` | Same error injected only on the first attempt: automatic retry recovers, model becomes usable | OK — see `03-gpu-fault-recovered-answers.png` |
| `s3-switch-model` | Switching models via the picker disposes (`unload()`) the old engine before loading the new one | OK — see `04-model-switch-disposes-old.png` |
| `s4-concurrent-send` | Two messages sent back-to-back without waiting no longer get their answers swapped (old bug: shared promise leaked the first answer onto the second bubble) | OK |
| `s5-f16-gating` | Picker hides `(f16)` model variants when the GPU adapter doesn't support `shader-f16` | OK — see `05-picker-f16-gating.png` |

## Bugs found and fixed (`js/llm-engine.js`)

1. **Message-order / GPU-race bug.** `reply()` used `if (busy) return busy;`
   as a re-entrancy guard: a second message sent while the first was still
   generating got back the *first* message's answer, and the model's
   `chat.completions.create` could be invoked twice concurrently on the same
   engine — a very plausible cause of the "GPUBuffer... Instance reference"
   error, since two concurrent generate calls race on the same WASM/GPU
   buffers. Fixed with a proper promise chain that queues replies instead of
   deduplicating them.
2. **False "siap" (ready) message.** `ensure()` considered the engine ready
   as soon as `CreateMLCEngine` resolved. If the underlying runtime hadn't
   actually finished wiring up the model, the first real question would fail
   with "Model not loaded before trying to complete ChatCompletionRequest" —
   *after* the user already saw "Gawean siap". Fixed by doing a real 1-token
   warmup completion inside `createEngine()` before the engine is ever handed
   out; if that warmup fails, activation fails with a clear error instead of
   a fake-ready message.
3. **No recovery from a GPU fault during initial load**, only during a later
   message. Added the same dispose-and-retry-once logic to the initial
   `ensure()` path.
4. **Stale engine after switching models.** The old build locked the app to
   one hardcoded model and had no real switch path. Restored a real picker
   over a 10-model ladder (Qwen2.5 0.5B → 3B, Llama 3.2 1B, Gemma 2 2B, Phi
   3.5 Mini) with `f16` variants gated by `adapter.features.has("shader-f16")`,
   and `choose()` now disposes the previous engine before switching.

## Ladder (smallest → largest, as requested)

```
Qwen2.5-0.5B-Instruct-q4f32_1-MLC      (default)
Qwen2.5-0.5B-Instruct-q4f16_1-MLC      (needs shader-f16)
Llama-3.2-1B-Instruct-q4f32_1-MLC
Llama-3.2-1B-Instruct-q4f16_1-MLC      (needs shader-f16)
gemma-2-2b-it-q4f32_1-MLC
gemma-2-2b-it-q4f16_1-MLC              (needs shader-f16)
Qwen2.5-1.5B-Instruct-q4f32_1-MLC
Qwen2.5-1.5B-Instruct-q4f16_1-MLC      (needs shader-f16)
Qwen2.5-3B-Instruct-q4f32_1-MLC
Phi-3.5-mini-instruct-q4f16_1-MLC      (needs shader-f16)
```

## What still needs to happen on a real device

Run the app (this branch) on a machine/phone with normal internet access,
open "Pilih Mesin AI", and walk the ladder as originally planned — the picker
and retry logic now work, so this is just picking a model and sending the two
test messages. Whichever is the smallest one that answers both correctly
twice in a row is the real winner; if you want it saved as the new default,
change `LADDER[0]` in `js/llm-engine.js` (or ask and it'll be wired in).

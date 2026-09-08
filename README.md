# Gawean — Qwen 4B lokal

Chat web 100% di browser. Mesin: **Qwen2.5-4B-Instruct-q4f16_1-MLC** lewat `@mlc-ai/web-llm` (WebGPU). Tidak ada API online. Tidak ada mesin rule-based.

## Jalankan

```bash
python3 -m http.server 8080
```

Buka [http://localhost:8080/](http://localhost:8080/) di **Chrome** atau **Edge** terbaru (WebGPU wajib). Modul ES tidak jalan lewat `file://`.

Unduhan model pertama ±2.5 GB. Cache browser dipakai ulang. Setelah model tersimpan, mode offline tetap menjawab.

## Isi

| Path | Fungsi |
| --- | --- |
| `index.html` | Kerangka UI |
| `css/style.css` | Tampilan |
| `js/llm-engine.js` | WebLLM: init, chat, status |
| `js/main.js` | Integrasi UI |
| `assets/icon.svg` | Ikon |

## Syarat

- Chrome / Edge dengan WebGPU
- RAM/VRAM cukup untuk Qwen 4B q4
- Koneksi hanya untuk unduhan model pertama + library CDN

// Regression smoke test for the rule-based chat engine (js/ai/engine.js).
//
// This is a maintainer-only QA tool -- it is not part of the shipped
// template and buyers never need to run it. It exists because this
// engine's correctness depends on ~1,180 hand-tagged corpus entries
// across 55+ JSON files: a tag added to the wrong entry, or a keyword
// added to the wrong classify() pattern, can silently make an intent
// pull in the wrong content (see docs/UPGRADE_STATUS.md history and the
// git log around "template audit" for real examples this test was built
// to catch: greetings answered with store hours, a specific product's
// stock question losing its product context, etc).
//
// Run before shipping any revision that touches data/*.json or
// js/ai/engine.js:
//
//   npm i -D playwright   (one-time; not a project dependency)
//   node test/smoke.mjs
//
// Requires a static server for the repo root on :8080, e.g.:
//   python3 -m http.server 8080
//
// Exits non-zero (and prints which case failed) if anything regresses.

import { chromium } from "playwright";

const BASE_URL = process.env.GAWEAN_TEST_URL || "http://127.0.0.1:8080/index.html";
const SAMPLES = 20; // repeated because scoring ties break randomly among top-ranked rows

// Each case: fixed inputs, repeated SAMPLES times, every answer must satisfy `ok`.
const CASES = [
  {
    name: "sapaan tidak pernah dijawab jam buka",
    input: "halo",
    ok: (a) => !/jam|buka|tutup|operasional/i.test(a),
  },
  {
    name: "sapaan tidak pernah bocor placeholder mentah",
    input: "siapa kamu",
    ok: (a) => !a.includes("{name}") && !a.includes("{{"),
  },
  {
    name: '"bisa bantu apa" selalu dapat daftar layanan, bukan fallback generik',
    input: "bisa bantu apa min",
    ok: (a) => /jam buka|harga|stok|ongkir|alamat|komplain|pemesanan|ketersediaan/i.test(a),
  },
  {
    name: '"liat menu produk" tidak pernah dijawab daftar layanan bantuan',
    input: "boleh liat menu produknya?",
    ok: (a) => !/^bisa dibantu:/i.test(a),
  },
  {
    name: '"jam buka toko" selalu dapat info jam, bukan sapaan kosong',
    input: "toko buka jam berapa?",
    ok: (a) => /jam|buka|operasional|senin|sabtu/i.test(a),
  },
  {
    name: '"stok [produk katalog]" mengenali produknya, bukan tanya balik',
    input: "stok gula aren masih ada?",
    ok: (a) => /gula aren|22\.000/i.test(a),
  },
  {
    name: '"harga [produk katalog]" mengenali produknya',
    input: "harga kopi tubruk berapa?",
    ok: (a) => /kopi tubruk|28\.000/i.test(a),
  },
  {
    name: 'permintaan custom/sablon tidak dibajak jadi jawaban produk walau menyebut nama produk',
    input: "bisa custom warna kaos?",
    ok: (a) => !/^kaos polos cotton/i.test(a),
  },
  {
    name: '"selamat natal" tidak pernah dijawab ucapan ulang tahun/promosi/pernikahan acak',
    input: "selamat natal dan tahun baru",
    ok: (a) => /natal|tahun baru/i.test(a),
  },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForTimeout(3000); // let engine.init()'s corpus fetches settle

  let failed = 0;
  for (const c of CASES) {
    const answers = await page.evaluate(
      async ({ input, samples }) => {
        const mod = await import("/js/ai/engine.js");
        const out = [];
        for (let i = 0; i < samples; i++) out.push(mod.engine.respond(input));
        return out;
      },
      { input: c.input, samples: SAMPLES }
    );
    const bad = answers.filter((a) => !c.ok(a));
    if (bad.length) {
      failed++;
      console.log(`FAIL  ${c.name}`);
      console.log(`      input: "${c.input}"`);
      console.log(`      ${bad.length}/${SAMPLES} bad answers, e.g.: ${JSON.stringify([...new Set(bad)].slice(0, 3))}`);
    } else {
      console.log(`OK    ${c.name}`);
    }
  }

  if (consoleErrors.length) {
    failed++;
    console.log(`FAIL  console/page errors during boot: ${JSON.stringify(consoleErrors)}`);
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

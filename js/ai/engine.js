import { store } from "../store.js";

const NOISE = /lembur|regang|diurai|agenda penting|sisakan jeda/;

let corpus = [];
let lastIntent = "";
let lastGaya = "toko";

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function gayaOf(row) {
  return row.gaya || row.meta?.gaya || "";
}

function tagsOf(row) {
  return row.tags || [];
}

function fill(teks) {
  return store.fill(teks);
}

function detectGaya(t) {
  if (/\b(anda|bapak|ibu|mohon|izin)\b/.test(t)) lastGaya = "formal";
  else if (/\b(aku|kamu|ya+|nih|dong|gimana|mau tanya|nanya)\b/.test(t)) lastGaya = "santai";
  return lastGaya;
}

function classify(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return "kosong";
  if (/siapa\s+(kamu|anda|nama)|nama\s+kamu/.test(t)) return "identitas";
  if (/bisa\s+apa|fitur|bantuan|help|menu/.test(t)) return "bantuan";
  if (/(mau|boleh|izin)\s*(nanya|tanya)|tanya\s*(dong|ya|sebentar)|ada\s+yang\s+mau\s+ditanya/.test(t)) return "tanya";
  if (/jam\s+buka|buka\s+jam|hari\s+apa\s+buka|libur/.test(t)) return "jam";
  if (/jam\s+berapa|tanggal\s+berapa/.test(t)) return "waktu_now";
  if (/harga|tarif|diskon|promo/.test(t)) return "harga";
  if (/stok|masih\s+ada|ready/.test(t)) return "stok";
  if (/pesan|order|beli|checkout/.test(t)) return "pesan";
  if (/kirim|ongkir|resi|ekspedisi/.test(t)) return "kirim";
  if (/alamat|lokasi|maps|dimana\s+toko|di mana toko/.test(t)) return "alamat";
  if (/komplain|kecewa|rusak|salah\s+kirim|refund/.test(t)) return "komplain";
  if (/transfer|bukti\s+bayar|qris|cod|dp\b|rekening/.test(t)) return "bayar";
  if (/grosir|partai|reseller/.test(t)) return "grosir";
  if (/booking|reservasi|janji\s+datang/.test(t)) return "booking";
  if (/garansi|after\s*sales|servis/.test(t)) return "garansi";
  if (/katalog|rekomendasi|punya\s+apa|daftar\s+produk/.test(t)) return "katalog";
  if (store.matchProduk(t)) return "produk";
  if (/custom|request|sablon/.test(t)) return "custom";
  if (/status\s+pesan|sudah\s+transfer|menunggu\s+resi/.test(t)) return "followup";
  if (/selamat\s+ulang\s+tahun/.test(t)) return "ulang_tahun";
  if (/selamat\s+(lebaran|hari\s+raya)/.test(t)) return "lebaran";
  if (/selamat\s+(natal|tahun\s+baru)/.test(t)) return "ucapan";
  if (/selamat\s+(pagi|siang|sore|malam)|^(pagi|siang|sore|malam)\b/.test(t)) return "waktu";
  if (/^(hai|halo|hell?o|hei|hi)\b/.test(t)) return "hai";
  if (/apa\s+kabar|gimana\s+kabar/.test(t)) return "kabar";
  if (/terima\s+kasih|makasih|thanks/.test(t)) return "terima_kasih";
  if (/^(bye|dadah|sampai\s+jumpa|selamat\s+tinggal)\b/.test(t)) return "tutup";
  if (/^(ok|oke|ya|yup|sip|baik)\b/.test(t)) return lastIntent === "tanya" ? "tanya" : "setuju";
  return "umum";
}

const INTENT_TAGS = {
  identitas: ["identitas", "nama"],
  bantuan: ["bantuan", "fitur", "menu"],
  tanya: ["tanya", "izin"],
  setuju: ["setuju", "ok"],
  jam: ["jam", "buka", "libur"],
  waktu_now: ["waktu_now", "jam_sekarang"],
  harga: ["harga", "diskon", "promo"],
  stok: ["stok", "ready"],
  pesan: ["pesan", "order", "beli"],
  kirim: ["kirim", "ongkir", "resi"],
  alamat: ["alamat", "lokasi", "maps"],
  komplain: ["komplain", "refund"],
  bayar: ["bayar", "transfer", "cod", "dp", "qris"],
  grosir: ["grosir", "partai", "reseller"],
  booking: ["booking", "reservasi", "janji"],
  garansi: ["garansi", "servis", "aftersales"],
  katalog: ["katalog", "menu", "rekomendasi", "daftar"],
  produk: ["produk", "item"],
  custom: ["custom", "request", "sablon"],
  followup: ["followup", "status", "bukti", "menunggu"],
  ulang_tahun: ["ulang_tahun"],
  lebaran: ["lebaran"],
  ucapan: ["ucapan", "natal", "tahun_baru"],
  waktu: ["greeting", "waktu"],
  hai: ["hai", "halo", "buka"],
  kabar: ["kabar"],
  terima_kasih: ["terima_kasih", "makasih"],
  tutup: ["tutup", "penutup"],
  umum: ["umum", "lanjut"],
  kosong: ["kosong"],
};

function slotFrom(raw) {
  return (String(raw).toLowerCase().match(/\b(pagi|siang|sore|malam)\b/) || [])[0] || "";
}

function score(row, intent, raw, gaya) {
  const teks = String(row.teks || "");
  if (!teks) return -99;
  const tg = tagsOf(row);
  const kat = row.kategori || "";
  const want = INTENT_TAGS[intent] || [];
  let s = 0;
  if (want.some((t) => tg.includes(t) || row.meta?.jenis === t || kat === t || kat === intent)) s += 5;
  if (intent === "waktu") {
    const slot = slotFrom(raw);
    if (slot && (tg.includes(slot) || row.meta?.jenis === slot)) s += 6;
    if (kat === "greeting") s += 3;
  }
  if (gayaOf(row) === gaya) s += 4;
  else if (gayaOf(row) && gayaOf(row) !== gaya) s -= 2;
  if (/^selamat\b/i.test(teks) && intent === "waktu") s += 2;
  if (NOISE.test(teks)) s -= 10;
  if (tg.includes("fallback") && intent !== "umum") s -= 6;
  if (teks.length > 180) s -= 1;
  const words = String(raw).toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  words.forEach((w) => {
    if (teks.toLowerCase().includes(w) || tg.includes(w)) s += 1;
  });
  return s;
}

function pickRow(intent, raw) {
  const gaya = detectGaya(String(raw || "").toLowerCase());
  const ranked = corpus
    .map((x) => ({ x, s: score(x, intent, raw, gaya) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
  if (ranked.length) {
    const top = ranked.filter((r) => r.s >= ranked[0].s - 1).map((r) => r.x);
    return pick(top);
  }
  const fb = corpus.filter((x) => (x.tags || []).includes("lanjut") || (x.tags || []).includes("tanya"));
  return fb.length ? pick(fb) : null;
}

export const engine = {
  async init() {
    let list = [];
    try {
      const man = await fetch("data/manifest.json").then((r) => r.json());
      list = man.files || [];
    } catch {}
    const packs = await Promise.all(list.map((f) => fetch(f).then((r) => (r.ok ? r.json() : []))));
    corpus = packs
      .flatMap((pack) => (Array.isArray(pack) ? pack : pack.items || pack.data || []))
      .filter((x) => x && x.teks);
    lastIntent = "";
    lastGaya = "toko";
    await store.init();
    return corpus.length;
  },
  respond(text) {
    const intent = classify(text);
    lastIntent = intent;
    if (intent === "produk") {
      const p = store.matchProduk(text) || store.lastProduk();
      if (p) {
        store.setLastProduk(p);
        const rowP = pickRow("produk", text);
        const base = rowP ? rowP.teks : "{{item}} {{harga_item}}, stok {{stok_item}}.";
        return fill(base);
      }
    }
    if (intent === "katalog") {
      const list = store.katalog().map((p) => p.nama + " " + p.harga).join("; ");
      const rowK = pickRow("katalog", text);
      const head = rowK ? rowK.teks : "Yang ready:";
      return fill(head) + (list ? " " + list + "." : "");
    }
    const row = pickRow(intent, text);
    if (!row) return "";
    const vars = (row.meta?.variants || []).filter((v) => !NOISE.test(v));
    const teks = vars.length && Math.random() < 0.3 ? vars[0] : row.teks;
    return fill(teks);
  },
};

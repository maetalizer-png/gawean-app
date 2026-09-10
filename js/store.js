const KEY_TOKO = "gawean-toko";
const KEY_KATALOG = "gawean-katalog";

let toko = {};
let katalog = [];
let lastProduk = null;

export const store = {
  lastProduk() {
    return lastProduk;
  },
  setLastProduk(p) {
    lastProduk = p || null;
  },
  toko() {
    return toko;
  },
  katalog() {
    return katalog;
  },
  async init() {
    const baseToko = await fetch("data/toko.json").then((r) => r.json()).catch(() => ({}));
    const baseKat = await fetch("data/katalog/produk.json").then((r) => r.json()).catch(() => []);
    try {
      const over = JSON.parse(localStorage.getItem(KEY_TOKO) || "null");
      toko = { ...baseToko, ...(over || {}) };
    } catch {
      toko = baseToko;
    }
    try {
      const overK = JSON.parse(localStorage.getItem(KEY_KATALOG) || "null");
      katalog = Array.isArray(overK) ? overK : baseKat;
    } catch {
      katalog = baseKat;
    }
    return toko;
  },
  saveToko(next) {
    toko = { ...toko, ...next };
    localStorage.setItem(KEY_TOKO, JSON.stringify(toko));
    return toko;
  },
  saveKatalog(rows) {
    katalog = Array.isArray(rows) ? rows : katalog;
    localStorage.setItem(KEY_KATALOG, JSON.stringify(katalog));
    return katalog;
  },
  matchProduk(text) {
    const t = String(text || "").toLowerCase();
    if (/yang tadi|itu tadi|yang barusan/.test(t) && lastProduk) return lastProduk;
    const hit = katalog.find((p) => {
      const blob = (p.nama + " " + (p.tags || []).join(" ")).toLowerCase();
      return blob.split(/\s+/).some((w) => w.length > 3 && t.includes(w));
    });
    if (hit) lastProduk = hit;
    return hit || null;
  },
  fill(teks) {
    let out = String(teks || "");
    const map = {
      "{{now}}": new Date().toLocaleString("id-ID"),
      "{{nama}}": toko.nama || "",
      "{{toko}}": toko.nama || "",
      "{{jam}}": toko.jam || "",
      "{{alamat}}": toko.alamat || "",
      "{{area}}": toko.area || "",
      "{{rekening}}": toko.rekening || "",
      "{{wa}}": toko.wa || "",
      "{{garansi}}": toko.garansi || "",
    };
    Object.entries(map).forEach(([k, v]) => {
      out = out.split(k).join(v);
    });
    if (lastProduk) {
      out = out.split("{{item}}").join(lastProduk.nama || "");
      out = out.split("{{harga_item}}").join(lastProduk.harga || "");
      out = out.split("{{stok_item}}").join(lastProduk.stok || "");
    }
    return out;
  },
  waLink(text) {
    const n = String(toko.wa || "").replace(/\D/g, "");
    const q = encodeURIComponent(text || "Halo, lanjut dari chat toko.");
    return n ? "https://wa.me/" + n + "?text=" + q : "";
  },
};

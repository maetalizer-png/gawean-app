import { store } from "./store.js";
import { config } from "./config.js";

const KEY = "gawean-business";

const DEFAULTS = {
  brand: {
    name: "Gawean",
    tagline: "Mulai percakapan",
    logo: "",
    initials: "G",
  },
  contact: {
    whatsapp: "",
    email: "",
    phone: "",
  },
  location: {
    address: "",
    area: "",
    mapsUrl: "",
  },
  business: {
    category: "Toko",
    openingHours: "",
    warranty: "",
  },
  theme: {
    primary: "#0f766e",
    accent: "#14b8a6",
    radius: "18px",
  },
  chat: {
    welcomeMessage: "",
    placeholder: "Tulis pesan",
    showTypingIndicator: true,
  },
};

function deepMerge(base, over) {
  const out = { ...base };
  Object.keys(over || {}).forEach((k) => {
    if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k]) && base[k] && typeof base[k] === "object") {
      out[k] = deepMerge(base[k], over[k]);
    } else if (over[k] !== undefined && over[k] !== null && over[k] !== "") {
      out[k] = over[k];
    }
  });
  return out;
}

function dariToko(toko) {
  toko = toko || {};
  return {
    brand: {
      name: toko.nama,
      tagline: toko.tagline,
      initials: config.initials,
    },
    contact: {
      whatsapp: toko.wa,
    },
    location: {
      address: toko.alamat,
      area: toko.area,
    },
    business: {
      openingHours: toko.jam,
      warranty: toko.garansi,
    },
  };
}

function keToko(biz) {
  return {
    nama: biz.brand.name,
    tagline: biz.brand.tagline,
    jam: biz.business.openingHours,
    alamat: biz.location.address,
    area: biz.location.area,
    garansi: biz.business.warranty,
    wa: biz.contact.whatsapp,
  };
}

let current = deepMerge(DEFAULTS, {});

export const business = {
  current() {
    return current;
  },
  async init() {
    const toko = await store.init();
    let merged = deepMerge(DEFAULTS, dariToko(toko));
    try {
      const over = JSON.parse(localStorage.getItem(KEY) || "null");
      if (over) merged = deepMerge(merged, over);
    } catch {}
    current = merged;
    return current;
  },
  save(partial) {
    current = deepMerge(current, partial || {});
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {}
    const rekeningLama = (store.toko() && store.toko().rekening) || "";
    store.saveToko({ ...keToko(current), rekening: current.payment?.account || rekeningLama });
    return current;
  },
  applyTheme() {
    const root = document.documentElement;
    if (current.theme?.primary) root.style.setProperty("--accent", current.theme.primary);
    if (current.theme?.accent) root.style.setProperty("--accent-2", current.theme.accent);
    if (current.theme?.radius) root.style.setProperty("--radius-brand", current.theme.radius);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && current.theme?.primary) meta.setAttribute("content", current.theme.primary);
  },
  waLink(text) {
    return store.waLink(text);
  },
  mailLink(subject, body) {
    const email = (current.contact && current.contact.email) || "";
    if (!email) return "";
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: email,
      su: subject || current.brand.name + " — pertanyaan",
      body: body || "Halo, saya ingin bertanya lebih lanjut.",
    });
    return "https://mail.google.com/mail/?" + params.toString();
  },
  exportJson() {
    return JSON.stringify({ business: current, katalog: store.katalog() }, null, 2);
  },
  importJson(text) {
    const data = JSON.parse(text);
    if (data.business) business.save(data.business);
    if (Array.isArray(data.katalog)) store.saveKatalog(data.katalog);
    return current;
  },
};

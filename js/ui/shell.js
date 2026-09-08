import { $ } from "../dom.js";
import { config } from "../config.js";
import { auth } from "../auth.js";
import { store } from "../store.js";
import { business } from "../business.js";
import { attach } from "./attach.js";
import { chat } from "./chat.js";

const views = ["view-chat", "view-settings", "view-login"];

export const shell = {
  brand() {
    const biz = business.current();
    const nama = biz.brand.name || (store.toko() && store.toko().nama) || config.name;
    const tag = biz.brand.tagline || (store.toko() && store.toko().tagline) || config.tagline;
    document.title = nama;
    const map = {
      "side-name": nama,
      "empty-title": nama,
      "empty-tag": tag,
      "about-line": nama + " " + config.version,
    };
    Object.entries(map).forEach(([id, text]) => {
      const el = $(id);
      if (el) el.textContent = text;
    });
    const logo = biz.brand.logo;
    document.querySelectorAll(".gate-mark[data-brand-mark]").forEach((el) => {
      if (logo) {
        el.style.backgroundImage = "url(" + logo + ")";
        el.textContent = "";
      } else {
        el.style.backgroundImage = "";
        el.textContent = (biz.brand.initials || config.initials || "G").toUpperCase();
      }
    });
  },
  account() {
    const email = auth.session() || "";
    const initial = (email[0] || config.initials || "G").toUpperCase();
    const setMail = $("settings-email");
    const setInit = $("settings-initial");
    if (setMail) setMail.textContent = email || "—";
    if (setInit) setInit.textContent = initial;
    const sideInit = $("side-initial");
    if (sideInit) sideInit.textContent = initial;
    const btn = $("btn-login");
    if (btn) btn.title = email || "Akun";
  },
  show(id) {
    views.forEach((v) => {
      const el = $(v);
      if (el) el.hidden = v !== id;
    });
    document.body.classList.toggle("hide-chrome", id !== "view-chat");
    shell.closeSidebar();
    attach.close();
  },
  lock(on) {
    document.body.classList.toggle("locked", on);
    if (on) {
      views.forEach((v) => {
        const el = $(v);
        if (el) el.hidden = v !== "view-login";
      });
      document.body.classList.add("hide-chrome");
    } else {
      shell.account();
      shell.show("view-chat");
    }
  },
  refreshStorage() {
    const usedEl = $("cache-used");
    const detEl = $("cache-detail");
    const bar = $("cache-bar");
    if (!usedEl) return;
    const sizeOf = (k) => {
      try {
        const v = localStorage.getItem(k);
        return v ? (k.length + v.length) * 2 : 0;
      } catch {
        return 0;
      }
    };
    const chat = sizeOf("gawean-threads");
    const akun = sizeOf("gawean-session") + sizeOf("gawean-users") + sizeOf("gawean-theme");
    const lain = sizeOf("gawean-toko") + sizeOf("gawean-katalog") + sizeOf("gawean-business");
    const used = chat + akun + lain;
    const cap = 5 * 1024 * 1024;
    const fmt = (n) => {
      if (n < 1024) return n + " B";
      if (n < 1048576) {
        const k = n / 1024;
        return (k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(".", ",")) + " KB";
      }
      const m = n / 1048576;
      return (m >= 10 ? m.toFixed(1) : m.toFixed(2)).replace(".", ",") + " MB";
    };
    usedEl.textContent = fmt(used);
    const parts = [];
    parts.push(chat ? "percakapan " + fmt(chat) : "belum ada percakapan");
    if (akun) parts.push("akun " + fmt(akun));
    if (detEl) detEl.textContent = parts.join(" · ");
    if (bar) bar.style.width = Math.min(100, Math.max(used ? 4 : 0, Math.round((used / cap) * 100))) + "%";
  },
  openSidebar() {
    $("sidebar").classList.add("open");
    $("backdrop").classList.add("show");
  },
  closeSidebar() {
    $("sidebar").classList.remove("open");
    $("backdrop").classList.remove("show");
  },
  bind() {
    $("btn-menu").onclick = shell.openSidebar;
    $("backdrop").onclick = shell.closeSidebar;
    $("btn-settings").onclick = () => {
      shell.refreshStorage();
      shell.show("view-settings");
    };
    $("btn-back").onclick = () => {
      shell.show("view-chat");
      shell.openSidebar();
    };
    $("btn-login").onclick = () => shell.show("view-settings");
    $("btn-new-chat").onclick = () => {
      chat.fresh();
      shell.show("view-chat");
    };
    document.addEventListener("gawean-open-chat", () => shell.show("view-chat"));
    $("row-logout").onclick = () => {
      auth.logout();
      shell.lock(true);
    };
    let startX = 0, tracking = false;
    document.addEventListener("touchstart", (e) => {
      startX = e.changedTouches[0].clientX;
      tracking = startX < 24 || $("sidebar").classList.contains("open");
    }, { passive: true });
    document.addEventListener("touchend", (e) => {
      if (!tracking || document.body.classList.contains("locked")) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      if (!$("view-chat").hidden && startX < 24 && dx > 50) shell.openSidebar();
      if ($("sidebar").classList.contains("open") && dx < -50) shell.closeSidebar();
    }, { passive: true });
  },
};

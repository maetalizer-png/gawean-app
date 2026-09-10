import { $, toast } from "./dom.js";
import { auth } from "./auth.js";
import { engine } from "./ai/engine.js";
import { business } from "./business.js";
import { theme } from "./ui/theme.js";
import { shell } from "./ui/shell.js";
import { chat } from "./ui/chat.js";
import { attach } from "./ui/attach.js";
import { gate } from "./ui/gate.js";
import { settings } from "./ui/settings.js";

async function start() {
  shell.brand();
  theme.restore();
  shell.bind();
  chat.bind();
  attach.bind();
  gate.bind();
  settings.bind();

  document.querySelectorAll(".theme-tile[data-theme]").forEach((btn) => {
    btn.onclick = () => theme.apply(btn.dataset.theme);
  });
  document.addEventListener("gawean-rebrand", () => shell.brand());
  $("row-clear-chat").onclick = () => {
    chat.wipe();
    toast("Dikosongkan");
  };

  if (!auth.session()) {
    try { localStorage.setItem("gawean-session", "tamu@gawean.local"); } catch {}
  }
  shell.lock(false);
  chat.restore();

  document.documentElement.classList.remove("booting");
  document.documentElement.classList.add("ready");

  try {
    await engine.init();
    await business.init();
    business.applyTheme();
    shell.brand();
    settings.render();
  } catch {
    toast("Jalankan lewat http server");
  }
}

start();

import { $, toast } from "../dom.js";
import { auth } from "../auth.js";
import { shell } from "./shell.js";
import { chat } from "./chat.js";

let mode = "in";

function setMode(next) {
  mode = next;
  $("login-tab-in").classList.toggle("active", next === "in");
  $("login-tab-up").classList.toggle("active", next === "up");
  $("auth-submit").textContent = next === "in" ? "Masuk" : "Daftar";
  $("gate-title").textContent = next === "in" ? "Masuk" : "Daftar";
  $("auth-error").textContent = "";
}

export const gate = {
  bind() {
    $("login-tab-in").onclick = () => setMode("in");
    $("login-tab-up").onclick = () => setMode("up");
    $("auth-submit").onclick = async () => {
      $("auth-error").textContent = "";
      try {
        const email = $("auth-email").value;
        const pass = $("auth-pass").value;
        if (mode === "up") await auth.register(email, pass);
        else await auth.login(email, pass);
        shell.lock(false);
        shell.account();
        chat.restore();
        toast("Selamat datang");
      } catch (err) {
        $("auth-error").textContent = err.message || "Gagal";
      }
    };
  },
};

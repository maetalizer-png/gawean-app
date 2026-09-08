import { $, toast } from "../dom.js";
import { business } from "../business.js";
import { shell } from "./shell.js";

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const settings = {
  render() {
    const biz = business.current();
    const mailBtn = $("contact-mail");
    const mailLink = business.mailLink();
    if (mailBtn) {
      mailBtn.href = mailLink || "#";
      mailBtn.hidden = !mailLink;
    }
    const contactEmpty = $("contact-empty");
    if (contactEmpty) contactEmpty.hidden = !!mailLink;
    const catEl = $("about-category");
    if (catEl) catEl.textContent = biz.business.category || "";
  },
  bind() {
    const exportBtn = $("row-export");
    const importInput = $("row-import-file");
    const importBtn = $("row-import");
    if (exportBtn) {
      exportBtn.onclick = () => {
        downloadText("gawean-business.json", business.exportJson());
        toast("Berkas konfigurasi diunduh");
      };
    }
    if (importBtn && importInput) {
      importBtn.onclick = () => importInput.click();
      importInput.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        if (!file) return;
        try {
          const text = await file.text();
          business.importJson(text);
          business.applyTheme();
          settings.render();
          shell.refreshStorage();
          document.dispatchEvent(new CustomEvent("gawean-rebrand"));
          toast("Konfigurasi diterapkan");
        } catch {
          toast("Berkas tidak valid");
        }
      });
    }
  },
};

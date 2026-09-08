import { $ } from "../dom.js";
import { llm } from "../llm-engine.js";

function ensureUi() {
  const plus = $("btn-plus");
  if (plus && !$("btn-model")) {
    const btn = document.createElement("button");
    btn.id = "btn-model";
    btn.className = "icon";
    btn.type = "button";
    btn.setAttribute("aria-label", "Pilih mesin AI");
    btn.innerHTML = '<svg class="ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 9h.01M9 15h6" stroke-linecap="round"/></svg>';
    plus.insertAdjacentElement("afterend", btn);
  }
  if ($("model-sheet")) return;
  const sheet = document.createElement("div");
  sheet.id = "model-sheet";
  sheet.className = "sheet";
  sheet.hidden = true;
  sheet.innerHTML = '<div class="sheet-grab"></div><div class="sheet-head"><span>Pilih Mesin AI</span><button id="model-close" class="icon" type="button" aria-label="Tutup">×</button></div><div id="model-list" class="model-list"></div><button type="button" class="auth-submit" id="model-activate">Aktifkan mesin</button>';
  const attach = $("attach-sheet");
  if (attach && attach.parentNode) attach.insertAdjacentElement("afterend", sheet);
  else document.body.appendChild(sheet);
}

function paint() {
  const box = $("model-list");
  if (!box) return;
  box.innerHTML = "";
  const rows = llm.listPicker();
  if (!rows.length) {
    box.textContent = "Katalog model belum terbaca.";
    return;
  }
  rows.forEach((row) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "model-row" + (row.active ? " active" : "");
    btn.textContent = row.label;
    btn.onclick = async () => {
      btn.disabled = true;
      await llm.choose(row.id);
      paint();
    };
    box.appendChild(btn);
  });
}

export const models = {
  open() {
    ensureUi();
    $("sheet-backdrop").classList.add("show");
    $("model-sheet").hidden = false;
    paint();
  },
  close() {
    const sheet = $("model-sheet");
    if (sheet) sheet.hidden = true;
    const back = $("sheet-backdrop");
    if (back) back.classList.remove("show");
  },
  bind() {
    ensureUi();
    const btn = $("btn-model");
    if (btn) btn.onclick = () => models.open();
    const close = $("model-close");
    if (close) close.onclick = () => models.close();
    const act = $("model-activate");
    if (act) {
      act.onclick = () => {
        models.close();
        document.dispatchEvent(new CustomEvent("gawean-activate-model"));
      };
    }
  },
};

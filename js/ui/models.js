import { $ } from "../dom.js";
import { llm } from "../llm-engine.js";

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
      llm.choose(row.id);
      paint();
      document.dispatchEvent(new CustomEvent("gawean-model", { detail: row.id }));
    };
    box.appendChild(btn);
  });
}

export const models = {
  open() {
    $("sheet-backdrop").classList.add("show");
    $("model-sheet").hidden = false;
    paint();
  },
  close() {
    $("sheet-backdrop").classList.remove("show");
    $("model-sheet").hidden = true;
  },
  bind() {
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

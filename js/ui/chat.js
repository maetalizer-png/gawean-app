import { $ } from "../dom.js";
import { engine } from "../ai/engine.js";
import { threads } from "../threads.js";
import { business } from "../business.js";
import { store } from "../store.js";

function resizeInput() {
  const input = $("chat-input");
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
}

function paintList() {
  const list = $("history-list");
  const empty = $("history-empty");
  if (!list) return;
  list.innerHTML = "";
  const rows = threads.all();
  if (empty) empty.hidden = rows.length > 0;
  rows.forEach((item) => {
    const row = document.createElement("div");
    row.className = "hist-item" + (item.id === threads.currentId() ? " active" : "");
    row.dataset.id = item.id;
    const title = document.createElement("button");
    title.className = "hist-title";
    title.type = "button";
    title.textContent = item.title || "Chat";
    title.onclick = () => chat.openThread(item.id);
    const del = document.createElement("button");
    del.className = "hist-del";
    del.type = "button";
    del.setAttribute("aria-label", "Hapus");
    del.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    del.onclick = (e) => {
      e.stopPropagation();
      threads.remove(item.id);
      chat.render();
      paintList();
    };
    row.appendChild(title);
    row.appendChild(del);
    row.onclick = (e) => {
      if (e.target.closest(".hist-del")) return;
      chat.openThread(item.id);
    };
    list.appendChild(row);
  });
}

function bubble(role, text) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.textContent = text;
  return el;
}

function mediaBubble(src) {
  const wrap = document.createElement("div");
  wrap.className = "msg user media";
  const box = document.createElement("div");
  box.className = "msg-media";
  const img = document.createElement("img");
  img.src = src;
  box.appendChild(img);
  wrap.appendChild(box);
  return wrap;
}

export const chat = {
  openThread(id) {
    threads.open(id);
    chat.render();
    paintList();
    document.dispatchEvent(new CustomEvent("gawean-open-chat"));
  },
  render() {
    const box = $("messages");
    const empty = $("empty-state");
    box.innerHTML = "";
    const item = threads.current();
    const msgs = item ? item.messages : [];
    if (empty) empty.hidden = msgs.length > 0;
    msgs.forEach((m) => {
      if (m.image) box.appendChild(mediaBubble(m.image));
      if (m.text) box.appendChild(bubble(m.role, m.text));
    });
    box.scrollTop = box.scrollHeight;
  },
  add(role, text) {
    $("empty-state").hidden = true;
    const el = bubble(role, text);
    $("messages").appendChild(el);
    $("messages").scrollTop = $("messages").scrollHeight;
    return el;
  },
  addNode(node) {
    $("empty-state").hidden = true;
    $("messages").appendChild(node);
    $("messages").scrollTop = $("messages").scrollHeight;
  },
  rememberImage(src) {
    threads.append({ role: "user", text: "", image: src });
    paintList();
  },
  fresh() {
    threads.create("Chat baru");
    const welcome = business.current().chat.welcomeMessage;
    if (welcome) threads.append({ role: "ai", text: store.fill(welcome) });
    chat.render();
    paintList();
  },
  wipe() {
    threads.clearAll();
    chat.render();
    paintList();
  },
  restore() {
    chat.render();
    paintList();
  },
  async send() {
    const input = $("chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    resizeInput();
    threads.append({ role: "user", text });
    chat.add("user", text);
    paintList();
    const wait = chat.add("ai", "sedang mengetik…");
    wait.classList.add("typing");
    await engine.whenReady();
    const answer = engine.respond(text);
    await new Promise((r) => setTimeout(r, 450 + Math.min(answer.length * 8, 900)));
    wait.classList.remove("typing");
    wait.textContent = "";
    for (let i = 0; i < answer.length; i++) {
      wait.textContent += answer[i];
      $("messages").scrollTop = $("messages").scrollHeight;
      await new Promise((r) => setTimeout(r, answer[i] === " " ? 12 : 18));
    }
    threads.append({ role: "ai", text: answer });
  },
  bind() {
    $("btn-send").onclick = () => chat.send();
    $("chat-input").addEventListener("input", resizeInput);
    $("chat-input").addEventListener("keydown", (e) => {
      const enterSend = $("opt-enter") && $("opt-enter").checked;
      if (e.key === "Enter" && !e.shiftKey && enterSend) {
        e.preventDefault();
        chat.send();
      }
    });
    $("btn-chat-search").onclick = () => {
      const bar = $("chat-search-bar");
      bar.hidden = !bar.hidden;
      if (!bar.hidden) $("chat-search-input").focus();
    };
    $("chat-search-close").onclick = () => {
      $("chat-search-bar").hidden = true;
      $("chat-search-input").value = "";
      document.querySelectorAll(".msg.hit").forEach((el) => el.classList.remove("hit"));
    };
    $("chat-search-input").addEventListener("input", () => {
      const q = $("chat-search-input").value.trim().toLowerCase();
      const nodes = [...$("messages").querySelectorAll(".msg")];
      nodes.forEach((el) => el.classList.remove("hit"));
      if (!q) return;
      const found = nodes.find((el) => (el.textContent || "").toLowerCase().includes(q));
      if (found) {
        found.classList.add("hit");
        found.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
    $("history-search").addEventListener("input", () => {
      const q = $("history-search").value.trim().toLowerCase();
      $("history-list").querySelectorAll(".hist-item").forEach((el) => {
        el.hidden = q && !el.textContent.toLowerCase().includes(q);
      });
    });
  },
};

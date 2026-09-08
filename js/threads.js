const KEY = "gawean-threads";

function uid() {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && Array.isArray(raw.items)) return raw;
  } catch {}
  return { current: null, items: [] };
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    state.items = state.items.map((t) => ({
      ...t,
      messages: (t.messages || []).map((m) => (m.image ? { role: m.role, text: m.text || "", image: "" } : m)),
    }));
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }
}

export const threads = {
  state: read(),
  all() {
    return threads.state.items;
  },
  currentId() {
    return threads.state.current;
  },
  current() {
    const id = threads.state.current;
    return threads.state.items.find((t) => t.id === id) || null;
  },
  persist() {
    write(threads.state);
  },
  create(title) {
    const item = {
      id: uid(),
      title: title || "Chat baru",
      updated: Date.now(),
      messages: [],
    };
    threads.state.items.unshift(item);
    threads.state.current = item.id;
    threads.persist();
    return item;
  },
  ensure(title) {
    return threads.current() || threads.create(title);
  },
  open(id) {
    if (!threads.state.items.some((t) => t.id === id)) return threads.current();
    threads.state.current = id;
    threads.persist();
    return threads.current();
  },
  remove(id) {
    threads.state.items = threads.state.items.filter((t) => t.id !== id);
    if (threads.state.current === id) {
      threads.state.current = threads.state.items[0] ? threads.state.items[0].id : null;
    }
    threads.persist();
  },
  clearAll() {
    threads.state = { current: null, items: [] };
    threads.persist();
  },
  append(msg) {
    const item = threads.ensure(msg.text || "Lampiran");
    item.messages.push(msg);
    if (msg.role === "user" && msg.text) item.title = String(msg.text).slice(0, 36);
    item.updated = Date.now();
    const idx = threads.state.items.findIndex((t) => t.id === item.id);
    if (idx > 0) {
      const [row] = threads.state.items.splice(idx, 1);
      threads.state.items.unshift(row);
    }
    threads.persist();
    return item;
  },
};

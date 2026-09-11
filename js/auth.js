const USERS = "gawean-users";
const SESSION = "gawean-session";

async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function users() {
  try { return JSON.parse(localStorage.getItem(USERS) || "[]"); }
  catch { return []; }
}

export const auth = {
  session() { return localStorage.getItem(SESSION); },
  logout() { localStorage.removeItem(SESSION); },
  async register(email, password) {
    email = String(email || "").trim().toLowerCase();
    if (!email.includes("@") || password.length < 6) {
      throw new Error("Email tidak valid atau kata sandi kurang dari 6 karakter.");
    }
    const list = users();
    if (list.some((u) => u.email === email)) throw new Error("Email sudah terdaftar.");
    const salt = crypto.randomUUID();
    list.push({ email, salt, hash: await sha(salt + password), created: Date.now() });
    localStorage.setItem(USERS, JSON.stringify(list));
    localStorage.setItem(SESSION, email);
    return email;
  },
  async login(email, password) {
    email = String(email || "").trim().toLowerCase();
    const user = users().find((u) => u.email === email);
    if (!user) throw new Error("Akun tidak ditemukan.");
    if (await sha(user.salt + password) !== user.hash) throw new Error("Kata sandi salah.");
    localStorage.setItem(SESSION, email);
    return email;
  },
};


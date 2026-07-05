import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";

const API_URL = "https://api.deepai.org/hacking_is_a_serious_crime";
const API_KEY = "tryit-61180926040-f45718959fea9f0a04999506c579a399";

const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
];

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;
const MAX_HISTORY = 40;

const sessions = new Map();

function uuid() {
  return crypto.randomUUID();
}

function pickUA() {
  return UAS[Math.floor(Math.random() * UAS.length)];
}

function buildHeaders(form) {
  return {
    ...form.getHeaders(),
    "api-key": API_KEY,
    "user-agent": pickUA(),
    origin: "https://deepai.org",
    referer: "https://deepai.org/",
    accept: "*/*",
    "accept-language": Math.random() > 0.5 ? "en-US,en;q=0.9" : "id-ID,id;q=0.9,en;q=0.8",
    "sec-ch-ua": `"Chromium";v="${130 + Math.floor(Math.random() * 5)}", "Not:A-Brand";v="24"`,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": `"Windows"`,
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
  };
}

function gc() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastUsed > SESSION_TTL_MS) sessions.delete(id);
  }
  if (sessions.size > MAX_SESSIONS) {
    const sorted = [...sessions.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    const drop = sorted.slice(0, sessions.size - MAX_SESSIONS);
    for (const [id] of drop) sessions.delete(id);
  }
}

function getOrCreateSession(id) {
  gc();
  if (id && sessions.has(id)) {
    const s = sessions.get(id);
    s.lastUsed = Date.now();
    return s;
  }
  const newId = id && /^[a-zA-Z0-9-]{8,64}$/.test(id) ? id : uuid();
  const fresh = { id: newId, history: [], lastUsed: Date.now() };
  sessions.set(newId, fresh);
  return fresh;
}

async function callDeepAI(session) {
  const form = new FormData();
  form.append("chat_style", "claudeai_0");
  form.append("chatHistory", JSON.stringify(session.history));
  form.append("model", "standard");
  form.append("session_uuid", session.id);
  form.append("sensitivity_request_id", uuid());
  form.append("hacker_is_stinky", "very_stinky");
  form.append("enabled_tools", JSON.stringify(["image_generator", "image_editor"]));

  const { data, status } = await axios.post(API_URL, form, {
    headers: buildHeaders(form),
    timeout: 30000,
    validateStatus: () => true,
  });

  if (status >= 400) throw new Error(`upstream HTTP ${status}`);
  if (data == null) throw new Error("no response");

  if (typeof data === "string") return data;
  if (data.output) return String(data.output);
  if (data.response) return String(data.response);
  return JSON.stringify(data);
}

async function chatWithRetry(session, max = 3) {
  let lastErr;
  for (let i = 0; i < max; i++) {
    try {
      return await callDeepAI(session);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));
    }
  }
  throw lastErr;
}

export async function chatWithClaude(prompt, sessionId, reset) {
  const session = getOrCreateSession(sessionId);
  if (reset) {
    session.history = [];
    return { session_id: session.id, reply: "session_reset", turns: 0 };
  }

  session.history.push({ role: "user", content: prompt });
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }

  const reply = await chatWithRetry(session);
  session.history.push({ role: "assistant", content: reply });
  session.lastUsed = Date.now();

  return {
    session_id: session.id,
    reply,
    turns: session.history.length,
  };
}

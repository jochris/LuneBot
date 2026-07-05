import crypto from "crypto";

const API = "https://aga-api.aichatting.net/aigc/chat/v2/professional/stream";
const PUBLIC_KEY_BASE64 =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";
const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;
const MAX_HISTORY = 20;

const sessions = new Map();

function makePublicKey() {
  const wrapped = PUBLIC_KEY_BASE64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
}

function encryptVisitorId(visitorId) {
  const enc = crypto.publicEncrypt(
    { key: makePublicKey(), padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(visitorId),
  );
  return enc.toString("base64");
}

function newSession(id) {
  const sessId = id && /^[a-zA-Z0-9-]{8,64}$/.test(id) ? id : crypto.randomUUID();
  const visitorId = crypto.randomBytes(16).toString("hex");
  return {
    id: sessId,
    visitorId,
    vtoken: encryptVisitorId(visitorId),
    conversationId: crypto.randomInt(10000000, 99999999),
    messages: [],
    lastUsed: Date.now(),
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
  const fresh = newSession(id);
  sessions.set(fresh.id, fresh);
  return fresh;
}

function cleanAnswer(text) {
  return String(text || "")
    .replace(/-=-\s*--/g, " ")
    .replace(/--@DONE@--/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUserContent(prompt, imageDataUrl) {
  const parts = [{ type: "text", text: prompt }];
  if (imageDataUrl) parts.push({ type: "image_url", image_url: { url: imageDataUrl } });
  return parts;
}

async function callApi(session, userMessage, model) {
  const body = {
    spaceHandle: true,
    roleId: 0,
    messages: [...session.messages.slice(-12), userMessage],
    conversationId: session.conversationId,
    model,
  };
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "sec-ch-ua-platform": `"Android"`,
      lang: "en",
      "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
      "sec-ch-ua-mobile": "?1",
      vtoken: session.vtoken,
      source: "web",
      "user-agent": UA,
      accept: "text/event-stream,application/json",
      "content-type": "application/json",
      origin: "https://www.aichatting.net",
      referer: "https://www.aichatting.net/",
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      priority: "u=1, i",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`upstream HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.body) throw new Error("response body kosong");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let answer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5);
      if (!data.trim()) continue;
      if (data.includes("--@DONE@--")) continue;
      answer += data;
    }
  }
  return cleanAnswer(answer);
}

export async function chatMultimodel(prompt, sessionId, model = "gpt-4o-mini", imageBuffer = null, mimeType = null, reset = false) {
  const session = getOrCreateSession(sessionId);
  if (reset) {
    session.messages = [];
    return { session_id: session.id, answer: "session_reset" };
  }

  let imageDataUrl = "";
  if (imageBuffer && mimeType) {
    imageDataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
  }

  const userMessage = {
    role: "user",
    content: buildUserContent(prompt, imageDataUrl),
  };

  const answer = await callApi(session, userMessage, model);
  if (!answer) {
    throw new Error("Empty response dari AI");
  }

  session.messages.push(userMessage);
  session.messages.push({
    role: "assistant",
    content: [{ type: "text", text: answer }],
  });
  if (session.messages.length > MAX_HISTORY) {
    session.messages = session.messages.slice(-MAX_HISTORY);
  }
  session.lastUsed = Date.now();

  return {
    session_id: session.id,
    answer,
    turns: session.messages.length,
  };
}

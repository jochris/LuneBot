const BASE_URL = "https://api.chatmusicpro.com";

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}

function makeHeaders(identityId, token) {
  const h = {
    "User-Agent": "android",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/x-www-form-urlencoded",
    "region-code": "ID",
    "user-type": "android",
    version: "1.0.3",
    "app-type": "1",
    language: "EN",
    "identity-id": identityId,
    "app-market": "google_play",
  };
  if (token) h.token = token;
  return h;
}

async function apiRequest(endpoint, data, identityId, token) {
  const url = `${BASE_URL}${endpoint}`;
  const body = new URLSearchParams(
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  ).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: makeHeaders(identityId, token),
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function login(identityId) {
  const r = await apiRequest(
    "/v1/user/device_login",
    { source_site: "google_play", identity_id: identityId },
    identityId,
  );
  if (r.code !== 200) throw new Error(`Login failed: ${r.message}`);
  return r.data.token;
}

export async function createMusic(params, identityId, token) {
  const payload = {
    music_model_id: params.modelId ?? 6,
    title: params.title || "rock",
    prompt: params.prompt || "",
    lyrics: params.lyrics || "",
    is_instrumental: params.isInstrumental ?? 0,
    music_style: params.musicStyle || "",
    music_style_code: params.musicStyleCode || "",
    gender_type: params.genderType ?? 0,
  };
  const r = await apiRequest("/music/create-music", payload, identityId, token);
  if (r.code !== 200) throw new Error(`Creation failed: ${r.message}`);
  return r.data.create_id;
}

export async function getProgress(id, identityId, token) {
  const r = await apiRequest("/music/get-music-progress", { id }, identityId, token);
  if (r.code !== 200) throw new Error(`Progress check failed: ${r.message}`);
  return r.data;
}

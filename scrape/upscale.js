import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";

const HOST = "https://api.pixelbin.io";
const PROD_KEY = "A4nzUYcDOZ";
const CAPTCHA = "skipcode:qNDyPnC0mz99CLugpqOQJxGp9yTQspHiYaEnoTCU";
const UPSCALE_PATH = "/service/public/transformation/v1.0/predictions/sr/upscale";

function extToMime(name) {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function authHeaders(method, path, deviceId) {
  const ts = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const str = method.toUpperCase() + encodeURI(path) + ts + deviceId;
  const sig = crypto.createHmac("sha256", PROD_KEY).update(str).digest("hex");
  return {
    "User-Agent": "Neo/1.0",
    "pixb-cl-id": deviceId,
    "captcha-code": CAPTCHA,
    "x-ebg-param": Buffer.from(ts).toString("base64"),
    "x-ebg-signature": sig,
  };
}

export async function upscaleImage(
  buffer,
  filename,
  scale = "2X",
  model = "picasso",
  enhanceFace = false,
  enhanceQuality = false,
  enhanceText = false
) {
  const deviceId = crypto.randomUUID();
  const form = new FormData();
  form.append("input.type", scale);
  form.append("input.model", model);
  form.append("input.enhance_face", String(enhanceFace));
  form.append("input.enhance_quality", String(enhanceQuality));
  form.append("input.enhance_text", String(enhanceText));
  form.append("input.image", buffer, { filename, contentType: extToMime(filename) });

  const up = await axios.post(HOST + UPSCALE_PATH, form, {
    headers: { ...authHeaders("POST", UPSCALE_PATH, deviceId), ...form.getHeaders() },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
  if (up.status >= 400 || !up.data?.urls?.get) {
    throw new Error(up.data?.message || `upscale request gagal HTTP ${up.status}`);
  }
  const pollPath = new URL(up.data.urls.get).pathname;

  for (let i = 0; i < 60; i++) {
    const res = await axios.get(HOST + pollPath, {
      headers: authHeaders("GET", pollPath, deviceId),
      validateStatus: () => true,
    });
    if (res.status >= 400) throw new Error(`poll gagal HTTP ${res.status}`);
    const st = res.data?.status;
    if (st === "SUCCESS" || st === "COMPLETED") {
      const output = res.data.output;
      if (typeof output === "string") return output;
      if (Array.isArray(output) && typeof output[0] === "string") return output[0];
      if (typeof res.data.url === "string") return res.data.url;
      if (typeof res.data.urls?.get === "string") return res.data.urls.get;
      return null;
    }
    if (["FAILED", "ERROR", "FAILURE"].includes(st)) {
      throw new Error(typeof res.data?.error === "string" ? res.data.error : "upscale gagal");
    }
    await sleep(2000);
  }
  throw new Error("upscale timeout");
}

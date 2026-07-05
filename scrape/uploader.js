import axios from "axios";
import FormData from "form-data";

const UPLOAD_URL = "https://cloud.yardansh.com/upload";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const BANNED_EXT = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".msi",
  ".com",
  ".scr",
  ".vbs",
  ".ps1",
]);

export function getExt(name) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx).toLowerCase();
}

export function sanitizeFilename(name) {
  return name.replace(/[\r\n\0]/g, "").slice(0, 255) || "upload";
}

export async function uploadToShaqCloud(buffer, filename, contentType) {
  const form = new FormData();
  form.append("file", buffer, {
    filename,
    contentType: contentType || "application/octet-stream",
  });
  const res = await axios.post(UPLOAD_URL, form, {
    headers: {
      ...form.getHeaders(),
      accept: "application/json",
      origin: "https://cloud.yardansh.com",
      referer: "https://cloud.yardansh.com/",
      "user-agent": UA,
    },
    timeout: 60000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300) {
    const msg =
      typeof res.data === "object" && res.data?.error
        ? res.data.error
        : `HTTP ${res.status}`;
    throw new Error(`upload gagal: ${msg}`);
  }
  return res.data;
}

import crypto from "node:crypto";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const IP_PREFIXES = [
  1, 2, 5, 23, 27, 31, 36, 37, 39, 42, 46, 49, 50, 60, 114, 117, 118, 119, 120,
  121, 122, 123, 124, 125, 126, 180, 182, 183,
];

const PROCESSING_CODES = new Set([100000, 100001, 300006]);
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 180000;

function randomIp() {
  const p = IP_PREFIXES[Math.floor(Math.random() * IP_PREFIXES.length)];
  return [
    p,
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
  ].join(".");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildHeaders(ip, serial) {
  return {
    "product-serial": serial,
    "x-forwarded-for": ip,
    "x-real-ip": ip,
    "user-agent": UA,
  };
}

async function createJob(buf, filename, mime, scale, model, headers) {
  const base = `https://api.unblurimage.ai/api/imgupscaler/${model}/ai-image-unblur`;
  const form = new FormData();
  form.append("original_image_file", new Blob([buf], { type: mime }), filename);
  form.append("scale_factor", scale);
  form.append("upscale_type", "image-upscale");
  const res = await fetch(`${base}/create-job`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json().catch(() => null);
  const jobId = data?.result?.job_id;
  if (!jobId) {
    throw new Error(
      `Create-job gagal: ${data?.message || JSON.stringify(data).slice(0, 200)}`
    );
  }
  return { jobId, base };
}

async function pollJob(base, jobId, headers) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${base}/get-job/${jobId}`, { headers });
    const data = await res.json().catch(() => null);
    if (!data) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    if (data.code === 100000 && data?.result?.output_url?.[0]) {
      return data.result.output_url[0];
    }
    if (!PROCESSING_CODES.has(data.code)) {
      throw new Error(
        `Upstream error ${data.code}: ${data.message || "unknown"}`
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timeout polling (>${Math.round(POLL_TIMEOUT_MS / 1000)}s)`);
}

export async function unblurImage(buf, filename, mime, quality = "2", model = "v2") {
  const headers = buildHeaders(randomIp(), crypto.randomBytes(16).toString("hex"));
  const { jobId, base } = await createJob(buf, filename, mime, quality, model, headers);
  const outputUrl = await pollJob(base, jobId, headers);
  return { jobId, outputUrl };
}

const SOLVER = "https://cf-solver-renofc.my.id/api/solvebeta";
const SITE_KEY = "0x4AAAAAAAApeO5gC2AwBbrW";
const TARGET_URL = "https://www.photoroom.com/tools/background-remover";
const SEGMENT_API = "https://sdk.photoroom.com/v1/segment";
const API_KEY = "10148f33e3f8d09a9b9aa6b775372a4ebf18b938";

async function getTurnstileToken() {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(SOLVER, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "turnstile-min",
        url: TARGET_URL,
        siteKey: SITE_KEY,
      }),
    });
    if (!res.ok) throw new Error(`Solver HTTP ${res.status}`);
    const data = await res.json();
    const token = data?.token?.result?.token;
    if (!token) throw new Error("Solver tidak mengembalikan token");
    return token;
  } finally {
    clearTimeout(tm);
  }
}

export async function removeBg(buf, mime, filename) {
  const token = await getTurnstileToken();
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buf)], { type: mime });
  form.append("image_file", blob, filename);

  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(SEGMENT_API, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": API_KEY,
        "x-captcha": `CLOUDFLARE_${token}`,
      },
      body: form,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`PhotoRoom HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(tm);
  }
}

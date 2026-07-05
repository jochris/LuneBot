export async function screenshotWeb(url) {
  try {
    const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`;
    const res = await fetch(screenshotUrl);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 1000) return buffer;
    }
  } catch (err) {
    console.error("Microlink screenshot failed, trying fallback:", err);
  }

  const fallbackUrl = `https://image.thum.io/get/width/1280/crop/800/${url}`;
  const res = await fetch(fallbackUrl);
  if (!res.ok) {
    throw new Error("Gagal mengambil screenshot dari semua provider.");
  }
  return Buffer.from(await res.arrayBuffer());
}

const BASE = "https://image.pollinations.ai";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

export async function drawImage(prompt, model = 'flux', width = 1024, height = 1024) {
    const url = `${BASE}/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${model}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    const res = await fetch(url, {
        headers: { "user-agent": UA }
    });
    if (!res.ok) {
        throw new Error(`Pollinations AI returned HTTP ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) {
        throw new Error("Received empty or invalid image buffer from Pollinations AI.");
    }
    return buffer;
}

import axios from 'axios';

const BASE = "https://spotisoft.com";
const NEXT_ACTION = "40016c43901dcc7fd55eca719fdb2c4944ab434fdb";
const ROUTER_STATE = "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%2Cnull%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C16%5D";
const UA = "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function baseHeaders() {
    return {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent": UA,
    };
}

async function initSession() {
    const res = await axios.get(BASE, { headers: baseHeaders(), maxRedirects: 5 });
    const cookies = res.headers["set-cookie"] || [];
    let cookieStr = "";
    let csrfToken = "";
    for (const cookie of cookies) {
        const part = cookie.split(";")[0];
        cookieStr += (cookieStr ? "; " : "") + part;
        if (part.startsWith("__Host-authjs.csrf-token=")) {
            csrfToken = decodeURIComponent(part.replace("__Host-authjs.csrf-token=", ""));
        }
    }
    return { cookieStr, csrfToken };
}

async function searchTrack(spotifyUrl, cookieStr) {
    const res = await axios.post(BASE, [spotifyUrl], {
        headers: {
            ...baseHeaders(),
            accept: "text/x-component",
            "content-type": "text/plain;charset=UTF-8",
            cookie: cookieStr,
            "next-action": NEXT_ACTION,
            "next-router-state-tree": ROUTER_STATE,
            origin: BASE,
            referer: BASE + "/",
        },
    });

    const lines = String(res.data).split("\n");
    for (const line of lines) {
        if (line.startsWith("1:") && line.includes('"success":true')) {
            try {
                const parsed = JSON.parse(line.substring(2));
                if (parsed?.success) return parsed;
            } catch {}
        }
    }
    throw new Error("Failed to fetch track data");
}

async function fetchMp3(spotifyUrl, token, track, cookieStr) {
    const payload = {
        url: spotifyUrl,
        token,
        quality: "128",
        branding: "SpotiSoft",
        title: track.name,
        artist: track.artists?.join(", ") || "",
        imageUrl: track.image || "",
    };
    const res = await axios.post(`${BASE}/api/proxy/download`, payload, {
        headers: {
            accept: "*/*",
            "content-type": "application/json",
            cookie: cookieStr,
            origin: BASE,
            referer: BASE + "/",
            "user-agent": UA,
        },
        responseType: "arraybuffer",
    });
    return Buffer.from(res.data);
}

function sanitize(s) {
    return String(s || "").replace(/[<>:"/\\|?*]/g, "").trim();
}

export default {
    name: 'spotify',
    aliases: ['sp', 'spdl'],
    description: 'Download lagu dari Spotify.',
    category: 'downloader',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL Spotify track. Contoh: .spotify https://open.spotify.com/track/09eWF5r8kasfOEp8RFRQLv');
            return;
        }

        const url = args[0];
        try {
            const session = await initSession();
            const searchResult = await searchTrack(url, session.cookieStr);
            const track = searchResult.data;
            const token = searchResult.token;
            const buf = await fetchMp3(url, token, track, session.cookieStr);

            const fileName = `${sanitize(track.artists?.[0] || "Unknown")} - ${sanitize(track.name || "track")}.mp3`;
            await sock.sendMessage(m.from, {
                audio: buf,
                mimetype: 'audio/mpeg',
                fileName: fileName
            }, { quoted: m.raw });
        } catch (err) {
            console.error('Error Spotify DL:', err);
            await m.reply(`Gagal mendownload Spotify: ${err.message}`);
        }
    }
};

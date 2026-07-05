import axios from 'axios';
import crypto from 'node:crypto';

const API = "https://api.hitube.io";
const WEB = "https://www.hitube.io";
const PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

const PEM = `-----BEGIN PUBLIC KEY-----\n${(PUBLIC_KEY.match(/.{1,64}/g) || []).join("\n")}\n-----END PUBLIC KEY-----`;

function createSessionId() {
    const random = crypto.randomBytes(6).toString("base64url").slice(0, 10);
    return `hitube.io_${random}_${Date.now()}`;
}

function createSecureMessage() {
    const encrypted = crypto.publicEncrypt(
        { key: PEM, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(Date.now().toString())
    );
    return encrypted.toString("base64");
}

function mediaUrl(token, sessionid) {
    return `${API}/st-tik-video/token/${encodeURIComponent(token)}?sessionid=${encodeURIComponent(sessionid)}&wh=www.hitube.io`;
}

function mapMedia(item, sessionid) {
    const data = {
        type: item.type || "file",
        url: item.url ? mediaUrl(item.url, sessionid) : null,
    };
    if (item.tag) data.quality = item.tag;
    if (item.size) data.size = item.size;
    if (item.cover) data.cover = mediaUrl(item.cover, sessionid);
    if (item.thumb) data.thumbnail = mediaUrl(item.thumb, sessionid);
    return data;
}

async function downloadFacebook(url) {
    const sessionid = createSessionId();

    const res = await axios.get(`${API}/st-tik-video/fb/dl`, {
        timeout: 60000,
        validateStatus: () => true,
        params: { url, sessionid },
        headers: {
            "x-secure-message": createSecureMessage(),
            accept: "application/json, text/plain, */*",
            origin: WEB,
            referer: `${WEB}/`,
            "user-agent": UA,
        },
    });

    const data = res.data;
    if (res.status !== 200 || data?.code !== 200) {
        return {
            success: false,
            code: data?.code || res.status,
            input: url,
            results: [],
        };
    }

    const list = Array.isArray(data?.result?.fbBos) ? data.result.fbBos : [];
    const results = list.map((item) => mapMedia(item, sessionid)).filter((item) => item.url);

    return {
        success: results.length > 0,
        code: data.code,
        input: url,
        total: results.length,
        results,
    };
}

export default {
    name: 'facebook',
    aliases: ['fb', 'fbdl'],
    description: 'Download video dari Facebook.',
    category: 'downloader',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL Facebook. Contoh: .facebook https://www.facebook.com/share/v/1CGj5okEfF/');
            return;
        }

        const url = args[0];
        try {
            const data = await downloadFacebook(url);
            if (!data.success || data.results.length === 0) {
                await m.reply('Media tidak ditemukan atau gagal diekstrak.');
                return;
            }

            const videoItem = data.results.find(item => item.type === 'video') || data.results[0];
            const quality = videoItem.quality || 'HD/SD';

            let captionText = `🎥 *FACEBOOK DOWNLOADER*\n\n`;
            captionText += `🔗 *Sumber*: ${url}\n`;
            captionText += `🏷️ *Kualitas*: ${quality}\n`;
            captionText = captionText.trim();

            if (videoItem.type === 'video') {
                await sock.sendMessage(m.from, { video: { url: videoItem.url }, caption: captionText }, { quoted: m.raw });
            } else {
                await sock.sendMessage(m.from, { image: { url: videoItem.url }, caption: captionText }, { quoted: m.raw });
            }
        } catch (err) {
            console.error('Error Facebook DL:', err);
            await m.reply(`Gagal mendownload Facebook: ${err.message}`);
        }
    }
};

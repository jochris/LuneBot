import { normalizeJid } from '#helper/jid';

function detectType(url) {
    try {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        if (token) {
            const parts = token.split('.');
            if (parts.length >= 2) {
                const payloadBase64 = parts[1];
                const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = Buffer.from(normalized, 'base64').toString('utf8');
                const parsed = JSON.parse(decoded);
                const realUrl = parsed.url || '';
                const filename = parsed.filename || '';
                const checkStr = (realUrl + ' ' + filename).toLowerCase();
                if (checkStr.includes('.mp4') || checkStr.includes('.mkv') || checkStr.includes('.mov')) {
                    return 'video';
                }
                if (checkStr.includes('.jpg') || checkStr.includes('.jpeg') || checkStr.includes('.png') || checkStr.includes('.webp')) {
                    return 'image';
                }
            }
        }
    } catch (e) {
        console.error('Error parsing token:', e);
    }

    const clean = url.split("?")[0].toLowerCase();
    if (clean.includes(".mp4")) return "video";
    if (
        clean.includes(".jpg") ||
        clean.includes(".jpeg") ||
        clean.includes(".png") ||
        clean.includes(".webp")
    ) {
        return "image";
    }
    return "image";
}

export default {
    name: 'instagram',
    aliases: ['ig', 'igdl'],
    description: 'Download media dari Instagram.',
    category: 'downloader',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL Instagram. Contoh: .instagram https://www.instagram.com/reel/DaMdaSFqDgp/');
            return;
        }

        const url = args[0].trim();
        try {
            await m.react('⏳');

            const apiUrl = `https://api.azbry.com/api/download/instagram?url=${encodeURIComponent(url)}`;
            const res = await fetch(apiUrl);
            if (!res.ok) {
                throw new Error(`API returned HTTP ${res.status}`);
            }

            const json = await res.json();
            if (!json.status) {
                throw new Error(json.message || 'Gagal mengekstrak media dari Instagram.');
            }

            const videos = json.videos || [];
            const images = json.images || [];

            const results = [];
            const rawUrls = [...videos, ...images];
            for (const itemUrl of rawUrls) {
                const determinedType = detectType(itemUrl);
                results.push({ type: determinedType, url: itemUrl });
            }

            const videoResults = results.filter(r => r.type === 'video').map(r => r.url);
            const imageResults = results.filter(r => r.type === 'image').map(r => r.url);

            if (videoResults.length === 0 && imageResults.length === 0) {
                throw new Error('Media tidak ditemukan pada postingan ini.');
            }

            let captionText = `📸 *INSTAGRAM DOWNLOADER*\n\n`;
            captionText += `🔗 *Sumber*: ${url}`;

            if (imageResults.length > 0) {
                if (imageResults.length <= 3) {
                    for (const imgUrl of imageResults) {
                        await sock.sendMessage(m.from, { image: { url: imgUrl }, caption: captionText }, { quoted: m.raw });
                    }
                } else {
                    const firstThree = imageResults.slice(0, 3);
                    for (const imgUrl of firstThree) {
                        await sock.sendMessage(m.from, { image: { url: imgUrl }, caption: captionText }, { quoted: m.raw });
                    }

                    const recipientJid = normalizeJid(m.sender);
                    const restImages = imageResults.slice(3);
                    for (const imgUrl of restImages) {
                        await sock.sendMessage(recipientJid, { image: { url: imgUrl }, caption: captionText });
                    }

                    if (m.isGroup) {
                        const notifyText = `📸 *INSTAGRAM DOWNLOADER*\n\nHalo @${recipientJid.split('@')[0]}, sisa *${restImages.length}* foto lainnya telah dikirim ke chat pribadi kamu ya!`;
                        await sock.sendMessage(m.from, {
                            text: notifyText,
                            mentions: [recipientJid]
                        }, { quoted: m.raw });
                    }
                }
            }

            for (const videoUrl of videoResults) {
                await sock.sendMessage(m.from, { video: { url: videoUrl }, caption: captionText }, { quoted: m.raw });
            }

            await m.react('✅');
        } catch (err) {
            console.error('Error Instagram DL:', err);
            await m.react('❌');
            await m.reply(`Gagal mendownload Instagram: ${err.message}`);
        }
    }
};

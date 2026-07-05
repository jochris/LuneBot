import { fileTypeFromBuffer } from 'file-type';

function getFilename(urlStr, contentType, contentDisposition) {
    if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=["']?([^"';]+)/i);
        if (match && match[1]) {
            let fn = match[1];
            if (fn.startsWith("utf-8''")) {
                fn = decodeURIComponent(fn.substring(7));
            }
            return fn;
        }
    }
    try {
        const u = new URL(urlStr);
        const base = u.pathname.split('/').pop();
        if (base) return decodeURIComponent(base);
    } catch (e) {}

    const extMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
        'audio/mpeg': 'mp3',
        'application/pdf': 'pdf',
        'application/json': 'json',
        'text/plain': 'txt',
        'text/html': 'html'
    };
    const ext = extMap[contentType.split(';')[0].trim()] || 'bin';
    return `file_${Date.now()}.${ext}`;
}

export default {
    name: 'fetch',
    aliases: ['get'],
    description: 'Mengambil data dari URL dan mengirimkannya kembali (Mendukung media, file, dan teks).',
    category: 'general',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL yang ingin diambil. Contoh: .fetch https://example.com/image.png');
            return;
        }

        let urlStr = args[0];
        if (!/^https?:\/\//i.test(urlStr)) {
            urlStr = 'https://' + urlStr;
        }

        try {
            const res = await fetch(urlStr, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!res.ok) {
                await m.reply(`Gagal mengambil data. Status: ${res.status} ${res.statusText}`);
                return;
            }

            const contentType = res.headers.get('content-type') || 'application/octet-stream';
            const contentDisposition = res.headers.get('content-disposition') || '';
            const buffer = Buffer.from(await res.arrayBuffer());

            let finalMime = contentType.split(';')[0].trim();
            try {
                const detected = await fileTypeFromBuffer(buffer);
                if (detected) {
                    finalMime = detected.mime;
                }
            } catch (err) {}

            const filename = getFilename(urlStr, finalMime, contentDisposition);

            if (finalMime.startsWith('image/')) {
                await sock.sendMessage(m.from, {
                    image: buffer,
                    caption: filename
                }, { quoted: m.raw });
            } else if (finalMime.startsWith('video/')) {
                await sock.sendMessage(m.from, {
                    video: buffer,
                    caption: filename
                }, { quoted: m.raw });
            } else if (finalMime.startsWith('audio/')) {
                await sock.sendMessage(m.from, {
                    audio: buffer,
                    mimetype: finalMime,
                    ptt: false
                }, { quoted: m.raw });
            } else if (finalMime.startsWith('text/') || finalMime === 'application/json' || finalMime === 'application/javascript') {
                const text = buffer.toString('utf-8');
                if (text.length <= 2000) {
                    await m.reply(text);
                } else {
                    await sock.sendMessage(m.from, {
                        document: buffer,
                        mimetype: finalMime,
                        fileName: filename
                    }, { quoted: m.raw });
                }
            } else {
                await sock.sendMessage(m.from, {
                    document: buffer,
                    mimetype: finalMime,
                    fileName: filename
                }, { quoted: m.raw });
            }
        } catch (err) {
            console.error('Error saat fetch/get:', err);
            await m.reply(`Error: ${err.message}`);
        }
    }
};

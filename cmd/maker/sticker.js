import sharp from 'sharp';
import { addStickerMetadata } from '../../helper/stickerExif.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function videoToWebp(videoBuffer) {
    const tempInput = path.join('/tmp', `stickervid_in_${Date.now()}.mp4`);
    const tempOutput = path.join('/tmp', `stickervid_out_${Date.now()}.webp`);

    fs.writeFileSync(tempInput, videoBuffer);

    try {
        await execAsync(`ffmpeg -y -i ${tempInput} -t 7 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0" -loop 0 -vcodec libwebp -f webp ${tempOutput}`);
        const webpBuffer = fs.readFileSync(tempOutput);
        return webpBuffer;
    } finally {
        try { fs.unlinkSync(tempInput); } catch {}
        try { fs.unlinkSync(tempOutput); } catch {}
    }
}

export default {
    name: 'sticker',
    aliases: ['s'],
    description: 'Mengubah gambar, GIF, atau video menjadi stiker dengan ukuran pas.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';
        const isVideo = m.type === 'videoMessage';
        const isQuotedVideo = m.quoted && m.quoted.type === 'videoMessage';

        if (!isImage && !isQuotedImage && !isVideo && !isQuotedVideo) {
            await m.reply('Silakan kirim gambar/video dengan caption *.sticker* atau balas (reply) media yang sudah ada.');
            return;
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();
            
            let webpBuffer;
            if (isVideo || isQuotedVideo) {
                webpBuffer = await videoToWebp(buffer);
            } else {
                webpBuffer = await sharp(buffer)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp()
                    .toBuffer();
            }

            const packName = 'LuneBot';
            const author = `${m.pushName || 'User'}\n\nSewa Bot Hubungi 62895416602000`;
            const webpWithMetadata = await addStickerMetadata(webpBuffer, packName, author);

            await sock.sendMessage(m.from, { sticker: webpWithMetadata }, { quoted: m.raw });
            await m.react('✅');
        } catch (err) {
            console.error('Error saat membuat stiker:', err);
            await m.react('❌');
            await m.reply('Gagal memproses media menjadi stiker. Pastikan berkas media tidak rusak.');
        }
    }
};

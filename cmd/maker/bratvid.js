import { bratVid } from '../../scrape/brat.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { addStickerMetadata } from '#helper/stickerExif';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export default {
    name: 'bratvid',
    description: 'Membuat stiker animasi teks meluncur bergaya brat dengan keburaman.',
    category: 'maker',
    async execute(sock, m, args) {
        let text = args.join(' ');
        if (!text && m.quoted && m.quoted.body) {
            text = m.quoted.body;
        }

        if (!text) {
            await m.reply('Silakan masukkan teks untuk membuat stiker brat animasi. Contoh: .bratvid mending turu aja');
            return;
        }

        if (text.length > 150) {
            await m.reply('Teks terlalu panjang! Maksimal 150 karakter.');
            return;
        }

        const wordCount = text.split(/\s+/).filter(Boolean).length;
        if (wordCount > 30) {
            await m.reply('Maksimal 30 kata agar proses render tidak terlalu lama.');
            return;
        }

        try {
            await m.react('⏳');

            const videoBuffer = await bratVid(text.trim(), {
                outputFormat: "mp4",
                fast_progress: true,
                lyric: {
                    maxWordPerLayer: 5,
                    frameDuration: 0.7,
                    lastFrameDuration: 1.5,
                },
                brat: { BLUR: 3 },
            });

            const tempMp4 = path.join('/tmp', `bratvid_${Date.now()}.mp4`);
            const tempWebp = path.join('/tmp', `bratvid_${Date.now()}.webp`);
            
            fs.writeFileSync(tempMp4, videoBuffer);

            await execAsync(`ffmpeg -y -i ${tempMp4} -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0" -loop 0 -vcodec libwebp -f webp ${tempWebp}`);

            const webpBuffer = fs.readFileSync(tempWebp);

            fs.unlinkSync(tempMp4);
            fs.unlinkSync(tempWebp);

            const packName = 'LuneBot';
            const author = `${m.pushName || 'User'}\n\nSewa Bot Hubungi 62895416602000`;
            const webpWithMetadata = await addStickerMetadata(webpBuffer, packName, author);

            await sock.sendMessage(m.from, { sticker: webpWithMetadata }, { quoted: m.raw });
            await m.react('✅');
        } catch (err) {
            console.error('Error saat membuat bratvid sticker:', err);
            await m.react('❌');
            await m.reply(`Gagal membuat stiker brat animasi: ${err.message}`);
        }
    }
};

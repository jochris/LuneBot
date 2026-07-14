import { bratGen } from '../../scrape/brat.js';
import sharp from 'sharp';
import { addStickerMetadata } from '#helper/stickerExif';

export default {
    name: 'brat',
    description: 'Membuat stiker bergaya brat (cover album Charli XCX) dengan keburaman.',
    category: 'maker',
    async execute(sock, m, args) {
        let text = args.join(' ');
        if (!text && m.quoted && m.quoted.body) {
            text = m.quoted.body;
        }

        if (!text) {
            await m.reply('Silakan masukkan teks yang ingin dibuat stiker brat. Contoh: .brat kangen mantan');
            return;
        }

        if (text.length > 150) {
            await m.reply('Teks terlalu panjang! Maksimal 150 karakter.');
            return;
        }

        try {
            await m.react('⏳');

            const pngBuffer = await bratGen(text.trim(), { BLUR: 3 });

            const webpBuffer = await sharp(pngBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            const packName = 'LuneBot';
            const author = `${m.pushName || 'User'}\n\nSewa Bot Hubungi 62895416602000`;
            const webpWithMetadata = await addStickerMetadata(webpBuffer, packName, author);

            await sock.sendMessage(m.from, { sticker: webpWithMetadata }, { quoted: m.raw });
            await m.react('✅');
        } catch (err) {
            console.error('Error saat membuat brat:', err);
            await m.react('❌');
            await m.reply(`Gagal membuat stiker brat: ${err.message}`);
        }
    }
};

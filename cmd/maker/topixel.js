import { pixelate } from '../../scrape/topixel.js';

export default {
    name: 'topixel',
    aliases: ['pixelate', 'pixelart'],
    description: 'Mengubah foto menjadi pixel art / gambar 8-bit.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            await m.reply('Kirim gambar dengan caption *.topixel* atau balas (reply) gambar yang sudah ada. Tingkat pixelasi: 1-40. Contoh: .topixel 25');
            return;
        }

        let level = 30;
        if (args.length > 0) {
            const inputLevel = parseInt(args[0]);
            if (Number.isFinite(inputLevel) && inputLevel >= 1 && inputLevel <= 40) {
                level = inputLevel;
            }
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();

            const resultBuffer = await pixelate(buffer, level);

            await sock.sendMessage(
                m.from,
                { image: resultBuffer, caption: `✨ *Foto berhasil diubah ke Pixel Art (Level: ${level})!*` },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error ToPixel:', err);
            await m.react('❌');
            await m.reply(`Gagal memproses pixel art: ${err.message}`);
        }
    }
};

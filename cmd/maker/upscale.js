import { upscaleImage } from '../../scrape/upscale.js';

export default {
    name: 'upscale',
    aliases: ['scale', 'perbesar'],
    description: 'Meningkatkan resolusi foto (1X, 2X, 4X, 8X) menggunakan AI Pixelbin.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            await m.reply('Kirim gambar dengan caption *.upscale* atau balas (reply) gambar yang sudah ada. Opsi skala: 1X, 2X, 4X, 8X. Contoh: .upscale 4X');
            return;
        }

        let scale = '2X';
        if (args.length > 0) {
            const inputScale = args[0].toUpperCase();
            if (['1X', '2X', '4X', '8X'].includes(inputScale)) {
                scale = inputScale;
            } else if (['1', '2', '4', '8'].includes(inputScale)) {
                scale = inputScale + 'X';
            }
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();
            const mime = m.type === 'imageMessage' ? m.msg?.mimetype : m.quoted.msg?.mimetype;
            const ext = (mime || '').split('/')[1] || 'jpg';
            const filename = `image.${ext}`;

            const resultUrl = await upscaleImage(buffer, filename, scale, 'picasso', false, false, false);
            if (!resultUrl) throw new Error('Gagal mendapatkan URL gambar hasil upscale.');
            const imageRes = await fetch(resultUrl);
            if (!imageRes.ok) throw new Error('Gagal mengunduh gambar hasil upscale dari server AI.');
            const resultBuffer = Buffer.from(await imageRes.arrayBuffer());

            await sock.sendMessage(
                m.from,
                { image: resultBuffer, caption: `✨ *Foto berhasil ditingkatkan ke ${scale}!*` },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error Upscale:', err);
            await m.react('❌');
            await m.reply(`Gagal memproses upscale foto: ${err.message}`);
        }
    }
};

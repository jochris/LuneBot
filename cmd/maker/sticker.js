import sharp from 'sharp';
import { addStickerMetadata } from '../../helper/stickerExif.js';

export default {
    name: 'sticker',
    aliases: ['s'],
    description: 'Mengubah gambar menjadi stiker dengan ukuran pas.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            await m.reply('Silakan kirim gambar dengan caption *.sticker* atau balas (reply) gambar yang sudah ada.');
            return;
        }

        try {
            const buffer = await m.download();
            
            const webpBuffer = await sharp(buffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            const packName = 'LuneBot';
            const author = `${m.pushName || 'User'}\nsewa bot hubungi 62895416602000`;
            const webpWithMetadata = await addStickerMetadata(webpBuffer, packName, author);

            await sock.sendMessage(m.from, { sticker: webpWithMetadata }, { quoted: m.raw });
        } catch (err) {
            console.error('Error saat membuat stiker:', err);
            await m.reply('Gagal memproses gambar menjadi stiker.');
        }
    }
};

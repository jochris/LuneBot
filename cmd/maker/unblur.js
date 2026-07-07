import { unblurImage } from '../../scrape/unblur.js';

export default {
    name: 'unblur',
    aliases: ['pertajam'],
    description: 'Memperjelas foto buram menggunakan AI Unblur Image.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            await m.reply('Kirim gambar dengan caption *.unblur* atau balas (reply) gambar yang sudah ada.');
            return;
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();
            const mime = m.type === 'imageMessage' ? m.msg?.mimetype : m.quoted.msg?.mimetype;
            const ext = (mime || '').split('/')[1] || 'jpg';
            const filename = `image.${ext}`;

            const result = await unblurImage(buffer, filename, mime || 'image/jpeg', '2', 'v2');
            const imageRes = await fetch(result.outputUrl);
            if (!imageRes.ok) throw new Error('Gagal mengunduh gambar hasil unblur dari server AI.');
            const resultBuffer = Buffer.from(await imageRes.arrayBuffer());

            await sock.sendMessage(
                m.from,
                { image: resultBuffer, caption: '✨ *Foto berhasil diperjelas (unblur)!*' },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error Unblur:', err);
            await m.react('❌');
            await m.reply(`Gagal memproses unblur foto: ${err.message}`);
        }
    }
};

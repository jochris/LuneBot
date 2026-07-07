import { enhanceImage } from '../../scrape/enhance.js';

export default {
    name: 'enhance',
    aliases: ['ultrahd', 'hdultra'],
    description: 'Meningkatkan foto menjadi Ultra HD menggunakan AI Wink.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            await m.reply('Kirim gambar dengan caption *.enhance* atau balas (reply) gambar yang sudah ada.');
            return;
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();
            const mime = m.type === 'imageMessage' ? m.msg?.mimetype : m.quoted.msg?.mimetype;
            const ext = (mime || '').split('/')[1] || 'jpg';
            const filename = `image.${ext}`;

            const resultUrl = await enhanceImage(buffer, filename);
            const imageRes = await fetch(resultUrl);
            if (!imageRes.ok) throw new Error('Gagal mengunduh gambar hasil enhance dari server AI.');
            const resultBuffer = Buffer.from(await imageRes.arrayBuffer());

            await sock.sendMessage(
                m.from,
                { image: resultBuffer, caption: '✨ *Foto berhasil ditingkatkan ke Ultra HD!*' },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error Enhance Ultra HD:', err);
            await m.react('❌');
            await m.reply(`Gagal memproses Ultra HD foto: ${err.message}`);
        }
    }
};

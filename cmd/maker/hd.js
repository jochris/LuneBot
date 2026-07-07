import { enhanceHd } from '../../scrape/hd.js';

export default {
    name: 'hd',
    aliases: ['remini', 'hdr'],
    description: 'Meningkatkan kualitas foto menjadi HD (2x) menggunakan AI BeautyPlus.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            await m.reply('Kirim gambar dengan caption *.hd* atau balas (reply) gambar yang sudah ada.');
            return;
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();
            const mime = m.type === 'imageMessage' ? m.msg?.mimetype : m.quoted.msg?.mimetype;
            const ext = (mime || '').split('/')[1] || 'jpg';
            const filename = `image.${ext}`;

            const resultUrl = await enhanceHd(buffer, filename);
            const imageRes = await fetch(resultUrl);
            if (!imageRes.ok) throw new Error('Gagal mengunduh gambar hasil HD dari server AI.');
            const resultBuffer = Buffer.from(await imageRes.arrayBuffer());

            await sock.sendMessage(
                m.from,
                { image: resultBuffer, caption: '✨ *Foto berhasil ditingkatkan ke HD!*' },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error HD Enhance:', err);
            await m.react('❌');
            await m.reply(`Gagal memproses HD foto: ${err.message}`);
        }
    }
};

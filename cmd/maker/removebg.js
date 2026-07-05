import { removeBg } from '../../scrape/removebg.js';

export default {
    name: 'removebg',
    aliases: ['nobg', 'rbg'],
    description: 'Menghapus latar belakang (background) dari gambar menggunakan AI.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');

        if (!isImage) {
            await m.reply('Kirim gambar atau reply gambar dengan caption *.removebg* untuk menghapus latar belakang gambar.');
            return;
        }

        try {
            await m.react('⏳');

            const mediaBuffer = await m.download();
            const mimeType = m.type === 'imageMessage' ? m.mime : m.quoted.mime;
            const filename = `image_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;

            const outBuffer = await removeBg(mediaBuffer, mimeType, filename);

            await sock.sendMessage(m.from, { 
                image: outBuffer, 
                caption: '✨ *Latar belakang berhasil dihapus!*' 
            }, { quoted: m.raw });

            await m.react('✅');
        } catch (err) {
            console.error('Error saat removebg:', err);
            await m.react('❌');
            await m.reply(`Gagal menghapus latar belakang: ${err.message}`);
        }
    }
};

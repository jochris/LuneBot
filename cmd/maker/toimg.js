import sharp from 'sharp';

export default {
    name: 'toimg',
    aliases: ['toimage', 'tomanusia'],
    description: 'Mengubah stiker statis menjadi gambar.',
    category: 'maker',
    async execute(sock, m, args) {
        const isSticker = m.type === 'stickerMessage';
        const isQuotedSticker = m.quoted && m.quoted.type === 'stickerMessage';

        if (!isSticker && !isQuotedSticker) {
            await m.reply('Silakan balas (reply) stiker yang ingin diubah menjadi gambar.');
            return;
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();
            
            const pngBuffer = await sharp(buffer)
                .png()
                .toBuffer();

            await sock.sendMessage(m.from, { image: pngBuffer, caption: 'Sukses mengubah stiker menjadi gambar!' }, { quoted: m.raw });
            await m.react('✅');
        } catch (err) {
            console.error('Error saat konversi stiker ke gambar:', err);
            await m.react('❌');
            await m.reply('Gagal mengubah stiker menjadi gambar. Pastikan stiker bukan stiker animasi.');
        }
    }
};

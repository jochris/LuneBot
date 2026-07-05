export default {
    name: 'swgc',
    aliases: ['statusgc', 'swg', 'sgc', 'statusgrup', '2'],
    description: 'Mengirimkan Status WhatsApp Group Chat (SWGC) langsung ke grup.',
    category: 'group',
    forAdminGrup: true,
    async execute(sock, m, args) {
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
        const hasMedia = mediaTypes.includes(m.type) || (m.quoted && mediaTypes.includes(m.quoted.type));
        const text = args.join(' ') || (m.quoted ? m.quoted.body : '') || '';

        let content = {};

        try {
            if (hasMedia) {
                const buffer = await m.download();
                const targetType = mediaTypes.includes(m.type) ? m.type : m.quoted.type;
                const captionText = args.join(' ') || '';

                if (targetType === 'imageMessage') {
                    content = { image: buffer, caption: captionText, groupStatus: true };
                } else if (targetType === 'videoMessage') {
                    content = { video: buffer, caption: captionText, groupStatus: true };
                } else if (targetType === 'audioMessage') {
                    content = { audio: buffer, ppt: true, groupStatus: true };
                }
            } else {
                if (!text) {
                    return m.reply('Silakan masukkan teks status, reply teks, atau reply media (gambar/video/audio).');
                }
                content = { text, groupStatus: true };
            }

            await sock.sendMessage(m.from, content);
        } catch (err) {
            console.error('Error saat mengirim SWGC:', err);
            await m.reply('Gagal mengirimkan SWGC ke grup. Pastikan format media sesuai.');
        }
    }
};

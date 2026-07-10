import { db } from '#lib/db';
import { pendingSwgc } from '#helper/pendingSwgc';
import { isOwnerJid, normalizeJid } from '#helper/jid';

export default {
    name: 'swgc',
    aliases: ['statusgc', 'swg', 'sgc', 'statusgrup', '2'],
    description: 'Mengirimkan Status WhatsApp Group Chat (SWGC) langsung ke grup.',
    category: 'owner',
    forOwner: true,
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
                    await m.reply('Silakan masukkan teks status, reply teks, atau reply media (gambar/video/audio).');
                    return;
                }
                content = { text, groupStatus: true };
            }

            const groups = db.query('SELECT id, subject FROM groups').all();
            if (!groups || groups.length === 0) {
                await sock.sendMessage(m.from, content);
                await m.reply('Mengirim langsung ke grup ini karena tidak ada grup lain terdeteksi di database.');
                return;
            }

            const senderHash = normalizeJid(m.sender);
            pendingSwgc.set(senderHash, {
                content,
                groups,
                timestamp: Date.now()
            });

            let menuText = `Daftar Grup:\n\n`;
            groups.forEach((g, idx) => {
                menuText += `${idx + 1}. *${g.subject || 'Grup Tanpa Nama'}*\n`;
            });
            menuText = menuText.trim();

            await m.reply(menuText);
        } catch (err) {
            console.error('Error saat memproses perintah swgc:', err);
            await m.reply('Gagal mengirimkan SWGC. Pastikan format media sesuai.');
        }
    }
};

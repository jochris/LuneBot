import { normalizeJid } from '#helper/jid';

export default {
    name: 'promote',
    description: 'Menjadikan anggota sebagai admin grup.',
    category: 'group',
    forAdminGrup: true,
    async execute(sock, m, args) {
        let target = m.mentions[0] || (m.quoted ? m.quoted.sender : null);
        if (!target && args.length > 0) {
            const cleanNum = args.join('').replace(/[^0-9]/g, '');
            if (cleanNum) {
                target = `${cleanNum}@s.whatsapp.net`;
            }
        }

        if (!target) {
            await m.reply('Silakan tag/mention, balas pesan, atau masukkan nomor anggota yang ingin dipromosikan.');
            return;
        }

        try {
            const groupMetadata = await sock.groupMetadata(m.from);
            const participants = groupMetadata.participants;

            const botJid = normalizeJid(sock.user.id);
            const botLid = sock.user.lid ? normalizeJid(sock.user.lid) : '';

            const botParticipant = participants.find(p => {
                const id = p.id ? normalizeJid(p.id) : '';
                const phone = p.phoneNumber ? normalizeJid(p.phoneNumber) : '';
                return id === botJid || id === botLid || phone === botJid || phone === botLid;
            });

            const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

            if (!isBotAdmin) {
                await m.reply('Gagal mengeksekusi. Pastikan bot sudah menjadi admin di grup ini.');
                return;
            }

            const targetNormalized = normalizeJid(target);
            const targetParticipant = participants.find(p => {
                const id = p.id ? normalizeJid(p.id) : '';
                const phone = p.phoneNumber ? normalizeJid(p.phoneNumber) : '';
                return id === targetNormalized || phone === targetNormalized;
            });

            if (!targetParticipant) {
                await m.reply('Anggota tidak ditemukan di grup ini.');
                return;
            }

            await sock.groupParticipantsUpdate(m.from, [targetParticipant.id], 'promote');
            await m.reply('Berhasil mempromosikan anggota tersebut menjadi admin.');
        } catch (err) {
            console.error('Error saat melakukan promote:', err);
            await m.reply('Gagal mempromosikan anggota.');
        }
    }
};

import { getSetting, getGroup, saveGroup } from '#lib/store';

function getJid(p) {
    if (!p) return '';
    if (typeof p === 'string') return p;
    return p.id || p.jid || '';
}

export async function handleGroupParticipantsUpdate(sock, event) {
    const { id, participants, action } = event;

    try {
        const jids = participants.map(p => getJid(p)).filter(Boolean);
        if (jids.length === 0) return;

        if (action === 'add') {
            const isWelcomeEnabled = getSetting(`welcome_${id}`, 'false') === 'true';
            if (!isWelcomeEnabled) return;

            let group = getGroup(id);
            if (!group) {
                try {
                    const metadata = await sock.groupMetadata(id);
                    saveGroup(id, metadata.subject, metadata.owner, metadata.desc, metadata.participants);
                    group = metadata;
                } catch (e) {
                    console.error('Gagal mengambil metadata grup untuk welcome:', e);
                }
            }

            const subject = group ? group.subject : 'Grup';
            const mentions = jids;
            const mentionText = jids.map(p => `@${p.split('@')[0]}`).join(', ');

            let welcomeText = `👋 *WELCOME* 👋\n\n`;
            welcomeText += `Halo ${mentionText}, selamat datang di grup *${subject}*!\n\n`;
            welcomeText += `Semoga betah ya di sini. Jangan lupa untuk mematuhi peraturan grup.`;

            await sock.sendMessage(id, {
                text: welcomeText,
                mentions
            });
        } else if (action === 'remove') {
            const isLeaveEnabled = getSetting(`leave_${id}`, 'false') === 'true';
            if (!isLeaveEnabled) return;

            let group = getGroup(id);
            if (!group) {
                try {
                    const metadata = await sock.groupMetadata(id);
                    saveGroup(id, metadata.subject, metadata.owner, metadata.desc, metadata.participants);
                    group = metadata;
                } catch (e) {
                    console.error('Gagal mengambil metadata grup untuk leave:', e);
                }
            }

            const subject = group ? group.subject : 'Grup';
            const mentions = jids;
            const mentionText = jids.map(p => `@${p.split('@')[0]}`).join(', ');

            let leaveText = `👋 *GOODBYE* 👋\n\n`;
            leaveText += `Selamat jalan ${mentionText} dari grup *${subject}*.\n\n`;
            leaveText += `Terima kasih pernah mampir dan berkontribusi di grup ini.`;

            await sock.sendMessage(id, {
                text: leaveText,
                mentions
            });
        }
    } catch (err) {
        console.error('Error saat menangani group-participants.update:', err);
    }
}

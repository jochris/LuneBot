import { delHama } from '#helper/hama';
import { normalizeJid, toJid } from '#helper/jid';

export default {
    name: 'delhama',
    aliases: ['unhama'],
    description: 'Menghapus target nomor (hama) dari daftar.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        let targetJid = null;

        if (m.quoted) {
            targetJid = m.quoted.sender;
        } else if (m.mentions && m.mentions.length > 0) {
            targetJid = m.mentions[0];
        } else if (args[0]) {
            const cleanNum = args[0].replace(/[^0-9]/g, '');
            if (cleanNum.length >= 8) {
                targetJid = toJid(cleanNum);
            }
        }

        if (!targetJid) {
            await m.reply(global.config.responses.hamaDeleteHelp + ' atau masukkan nomor langsung (contoh: .delhama 628123456789)');
            return;
        }

        const normalized = normalizeJid(targetJid);
        delHama(normalized);

        const replyMsg = global.config.responses.delHamaSuccess
            .replace('{user}', normalized.split('@')[0]);

        await m.reply(replyMsg, {
            mentions: [normalized]
        });
    }
};

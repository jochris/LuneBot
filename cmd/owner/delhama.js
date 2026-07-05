import { delHama } from '../../helper/hama.js';
import { normalizeJid } from '../../helper/jid.js';

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
        }

        if (!targetJid) {
            await m.reply(global.config.responses.hamaDeleteHelp);
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

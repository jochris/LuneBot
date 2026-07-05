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
            await m.reply('Silakan reply atau tag target user yang ingin dihapus dari daftar hama.');
            return;
        }

        const normalized = normalizeJid(targetJid);
        delHama(normalized);

        await m.reply(`Berhasil menghapus @${normalized.split('@')[0]} dari daftar hama.`, {
            mentions: [normalized]
        });
    }
};

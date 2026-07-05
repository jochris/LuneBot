import { addHama } from '../../helper/hama.js';
import { normalizeJid } from '../../helper/jid.js';

export default {
    name: 'addhama',
    aliases: ['hama'],
    description: 'Menambahkan target nomor (hama) untuk direspon otomatis.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        let targetJid = null;
        let text = args.join(' ');

        if (m.quoted) {
            targetJid = m.quoted.sender;
        } else if (m.mentions && m.mentions.length > 0) {
            targetJid = m.mentions[0];
            const cleanMention = `@${targetJid.split('@')[0]}`;
            if (text.includes(cleanMention)) {
                text = text.replace(cleanMention, '').trim();
            }
        }

        if (!targetJid) {
            await m.reply(global.config.responses.hamaTargetHelp);
            return;
        }

        if (!text) {
            await m.reply(global.config.responses.hamaTextHelp);
            return;
        }

        const normalized = normalizeJid(targetJid);
        addHama(normalized, text);

        const replyMsg = global.config.responses.addHamaSuccess
            .replace('{user}', normalized.split('@')[0])
            .replace('{text}', text);

        await m.reply(replyMsg, {
            mentions: [normalized]
        });
    }
};

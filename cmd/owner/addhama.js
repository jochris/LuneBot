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
            await m.reply('Silakan reply atau tag target user yang ingin ditambahkan sebagai hama. Contoh: .addhama <teks>');
            return;
        }

        if (!text) {
            await m.reply('Silakan masukkan pesan respons yang ingin dikirimkan. Contoh: .addhama berisik lu');
            return;
        }

        const normalized = normalizeJid(targetJid);
        addHama(normalized, text);

        await m.reply(`Berhasil menambahkan @${normalized.split('@')[0]} sebagai target hama dengan respons: "${text}"`, {
            mentions: [normalized]
        });
    }
};

import { addHama } from '../../helper/hama.js';
import { normalizeJid, toJid } from '../../helper/jid.js';
import { pendingHamaSticker } from '../../helper/pendingHama.js';

export default {
    name: 'addhama',
    aliases: ['hama'],
    description: 'Menambahkan target nomor (hama) untuk direspon otomatis.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        const option = args[0] ? args[0].toLowerCase() : '';
        const isStickerMode = option === 's' || option === 'sticker';

        let targetJid = null;
        let text = args.join(' ');

        if (m.quoted) {
            targetJid = m.quoted.sender;
        } else if (m.mentions && m.mentions.length > 0) {
            targetJid = m.mentions[0];
        } else if (args[0] && !isStickerMode) {
            const cleanNum = args[0].replace(/[^0-9]/g, '');
            if (cleanNum.length >= 8) {
                targetJid = toJid(cleanNum);
                text = args.slice(1).join(' ');
            }
        }

        if (isStickerMode) {
            if (!targetJid && args[1]) {
                const cleanNum = args[1].replace(/[^0-9]/g, '');
                if (cleanNum.length >= 8) {
                    targetJid = toJid(cleanNum);
                }
            }

            if (!targetJid) {
                await m.reply('Silakan reply, tag target, atau masukkan nomor target hama stiker. Contoh: .addhama s @user atau .addhama s 628123456789');
                return;
            }

            const normalized = normalizeJid(targetJid);
            pendingHamaSticker.set(normalizeJid(m.sender), {
                targetJid: normalized,
                timestamp: Date.now()
            });

            await m.reply(`Target stiker terdeteksi: @${normalized.split('@')[0]}.\n\nSilakan kirim stiker atau balas stiker untuk dijadikan respons otomatis untuk target ini.`, {
                mentions: [normalized]
            });
            return;
        }

        if (m.mentions && m.mentions.length > 0 && targetJid) {
            const cleanMention = `@${targetJid.split('@')[0]}`;
            if (text.includes(cleanMention)) {
                text = text.replace(cleanMention, '').trim();
            }
        }

        if (!targetJid) {
            await m.reply(global.config.responses.hamaTargetHelp + ' atau masukkan nomor langsung (contoh: .addhama 628123456789 <respons>)');
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

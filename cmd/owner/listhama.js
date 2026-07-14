import { getHamas } from '#helper/hama';

export default {
    name: 'listhama',
    aliases: ['hamalist', 'hamaall'],
    description: 'Menampilkan daftar target hama yang aktif.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        const hamas = getHamas();
        const jids = Object.keys(hamas);

        if (jids.length === 0) {
            await m.reply('Daftar target hama saat ini masih kosong.');
            return;
        }

        let text = '📝 *DAFTAR TARGET HAMA*\n\n';
        const mentions = [];
        let i = 1;
        for (const jid of jids) {
            const phone = jid.split('@')[0];
            text += `${i++}. @${phone} ➜ "${hamas[jid]}"\n`;
            mentions.push(jid);
        }

        await m.reply(text.trim(), { mentions });
    }
};

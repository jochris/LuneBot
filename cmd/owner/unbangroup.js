import { unbanGroup } from '../../helper/bannedGroups.js';

export default {
    name: 'unbangroup',
    aliases: ['unbangg', 'unbanch'],
    description: 'Mengizinkan kembali bot merespon di grup ini.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        if (!m.isGroup) {
            await m.reply('Perintah ini hanya dapat digunakan di dalam grup.');
            return;
        }

        unbanGroup(m.from);
        await m.reply('udah syg');
    }
};

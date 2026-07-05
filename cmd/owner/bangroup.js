import { banGroup } from '../../helper/bannedGroups.js';

export default {
    name: 'bangroup',
    aliases: ['bangg', 'banch'],
    description: 'Melarang bot merespon di grup ini (kecuali owner).',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        if (!m.isGroup) {
            await m.reply('Perintah ini hanya dapat digunakan di dalam grup.');
            return;
        }

        banGroup(m.from);
        await m.reply('udah syg');
    }
};

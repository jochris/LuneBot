import { unbanGroup } from '../../helper/bannedGroups.js';

export default {
    name: 'unbangroup',
    aliases: ['unbangg', 'unbanch'],
    description: 'Mengizinkan kembali bot merespon di grup ini.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        if (!m.isGroup) {
            await m.reply(global.config.responses.groupOnly);
            return;
        }

        unbanGroup(m.from);
        await m.reply(global.config.responses.unbanGroupSuccess);
    }
};

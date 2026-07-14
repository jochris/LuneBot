import { banGroup } from '#helper/bannedGroups';

export default {
    name: 'bangroup',
    aliases: ['bangg', 'banch'],
    description: 'Melarang bot merespon di grup ini (kecuali owner).',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        if (!m.isGroup) {
            await m.reply(global.config.responses.groupOnly);
            return;
        }

        banGroup(m.from);
        await m.reply(global.config.responses.banGroupSuccess);
    }
};

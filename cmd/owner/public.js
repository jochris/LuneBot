import { saveSetting } from '#lib/store';

export default {
    name: 'public',
    description: 'Mengubah mode bot menjadi Public (merespon semua user).',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        saveSetting('self_mode', 'false');
        await m.reply('Y dah');
    }
};

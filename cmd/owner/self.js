import { saveSetting } from '#lib/store';

export default {
    name: 'self',
    description: 'Mengubah mode bot menjadi Self (hanya merespon Owner).',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        saveSetting('self_mode', 'true');
        await m.reply('Y dah');
    }
};

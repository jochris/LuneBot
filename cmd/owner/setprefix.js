import { saveSetting } from '#lib/store';

export default {
    name: 'setprefix',
    description: 'Mengubah prefix perintah bot.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        const newPrefix = args[0];
        if (!newPrefix) {
            await m.reply('Silakan masukkan prefix baru. Contoh: .setprefix !');
            return;
        }

        saveSetting('prefix', newPrefix);
        await m.reply(`Prefix bot berhasil diubah menjadi: ${newPrefix}`);
    }
};

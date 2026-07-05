import { getSetting, saveSetting } from '#lib/store';

export default {
    name: 'welcome',
    description: 'Mengaktifkan atau menonaktifkan pesan welcome di grup.',
    category: 'group',
    forAdminGrup: true,
    async execute(sock, m, args) {
        if (!m.isGroup) {
            await m.reply('Perintah ini hanya dapat digunakan di dalam grup.');
            return;
        }

        const option = args[0] ? args[0].toLowerCase() : '';

        if (option === 'on' || option === 'enable' || option === 'true' || option === '1') {
            saveSetting(`welcome_${m.from}`, 'true');
            await m.reply('Pesan welcome berhasil *diaktifkan* di grup ini.');
        } else if (option === 'off' || option === 'disable' || option === 'false' || option === '0') {
            saveSetting(`welcome_${m.from}`, 'false');
            await m.reply('Pesan welcome berhasil *dinonaktifkan* di grup ini.');
        } else {
            const current = getSetting(`welcome_${m.from}`, 'false') === 'true';
            await m.reply(`Status welcome di grup ini saat ini adalah: *${current ? 'AKTIF' : 'NON-AKTIF'}*\n\nUntuk mengubah status, gunakan:\n- *.welcome on* (untuk mengaktifkan)\n- *.welcome off* (untuk menonaktifkan)`);
        }
    }
};

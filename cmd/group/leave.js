import { getSetting, saveSetting } from '#lib/store';

export default {
    name: 'leave',
    description: 'Mengaktifkan atau menonaktifkan pesan leave/goodbye di grup.',
    category: 'group',
    forAdminGrup: true,
    async execute(sock, m, args) {
        if (!m.isGroup) {
            await m.reply('Perintah ini hanya dapat digunakan di dalam grup.');
            return;
        }

        const option = args[0] ? args[0].toLowerCase() : '';

        if (option === 'on' || option === 'enable' || option === 'true' || option === '1') {
            saveSetting(`leave_${m.from}`, 'true');
            await m.reply('Pesan leave/goodbye berhasil *diaktifkan* di grup ini.');
        } else if (option === 'off' || option === 'disable' || option === 'false' || option === '0') {
            saveSetting(`leave_${m.from}`, 'false');
            await m.reply('Pesan leave/goodbye berhasil *dinonaktifkan* di grup ini.');
        } else {
            const current = getSetting(`leave_${m.from}`, 'false') === 'true';
            await m.reply(`Status leave/goodbye di grup ini saat ini adalah: *${current ? 'AKTIF' : 'NON-AKTIF'}*\n\nUntuk mengubah status, gunakan:\n- *.leave on* (untuk mengaktifkan)\n- *.leave off* (untuk menonaktifkan)`);
        }
    }
};

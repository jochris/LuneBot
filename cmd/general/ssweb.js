import { screenshotWeb } from '../../scrape/ssweb.js';

export default {
    name: 'ssweb',
    aliases: ['ss', 'screenshot'],
    description: 'Mengambil screenshot dari halaman website.',
    category: 'general',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL website yang ingin di-screenshot. Contoh: .ssweb https://google.com');
            return;
        }

        let url = args[0].trim();
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        try {
            await m.react('⏳');

            const buffer = await screenshotWeb(url);

            await sock.sendMessage(
                m.from,
                { image: buffer, caption: `Sukses mengambil screenshot website: ${url}` },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error saat ssweb:', err);
            await m.react('❌');
            await m.reply(`Gagal mengambil screenshot website: ${err.message}`);
        }
    }
};

import { renderIphoneQuote } from '../../scrape/iqc.js';

function nowJakarta() {
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta"
    })
    .format(new Date())
    .replace(":", ".");
}

export default {
    name: 'iqc',
    aliases: ['iphonequote', 'quoteiphone'],
    description: 'Membuat gambar bubble chat ala iPhone dengan kutipan teks.',
    category: 'maker',
    async execute(sock, m, args) {
        let text = args.join(' ');
        if (!text && m.quoted && m.quoted.body) {
            text = m.quoted.body;
        }

        if (!text) {
            await m.reply('Silakan masukkan teks kutipan yang ingin dibuat bubble chat iPhone. Contoh: .iqc Kesendirian adalah teman terbaik ku');
            return;
        }

        if (text.length > 300) {
            await m.reply('Teks terlalu panjang! Maksimal 300 karakter.');
            return;
        }

        try {
            await m.react('⏳');

            const time = nowJakarta();
            const buffer = await renderIphoneQuote(text, time);

            await sock.sendMessage(
                m.from,
                { image: buffer, caption: '✨ *iPhone Chat Quote berhasil dibuat!*' },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error saat membuat iqc:', err);
            await m.react('❌');
            await m.reply(`Gagal membuat iPhone quote: ${err.message}`);
        }
    }
};

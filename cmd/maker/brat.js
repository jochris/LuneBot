import sharp from 'sharp';

export default {
    name: 'brat',
    description: 'Membuat stiker bergaya brat (cover album Charli XCX) dengan keburaman.',
    category: 'maker',
    async execute(sock, m, args) {
        let text = args.join(' ');
        if (!text && m.quoted && m.quoted.body) {
            text = m.quoted.body;
        }

        if (!text) {
            await m.reply('Silakan masukkan teks yang ingin dibuat stiker brat. Contoh: .brat kangen mantan');
            return;
        }

        if (text.length > 150) {
            await m.reply('Teks terlalu panjang! Maksimal 150 karakter.');
            return;
        }

        try {
            await m.react('⏳');

            const apiUrl = `https://myapi.astralune.cv/api/v1/maker/brat?text=${encodeURIComponent(text.trim())}&blur=3`;
            const res = await fetch(apiUrl);
            if (!res.ok) {
                throw new Error(`API returned HTTP ${res.status}`);
            }

            const pngBuffer = Buffer.from(await res.arrayBuffer());

            const webpBuffer = await sharp(pngBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            await sock.sendMessage(m.from, { sticker: webpBuffer }, { quoted: m.raw });
            await m.react('✅');
        } catch (err) {
            console.error('Error saat membuat brat:', err);
            await m.react('❌');
            await m.reply(`Gagal membuat stiker brat: ${err.message}`);
        }
    }
};

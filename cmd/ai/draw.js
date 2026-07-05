import { drawImage } from '../../scrape/flux.js';

export default {
    name: 'draw',
    aliases: ['flux', 'dalle3', 'paint', 'image'],
    description: 'Menghasilkan gambar realistis / artistik menggunakan AI.',
    category: 'ai',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan prompt deskripsi gambar yang ingin dibuat. Contoh: .draw kucing cyberpunk di atap neon, 8k');
            return;
        }

        const prompt = args.join(' ');
        let model = 'flux';
        const cmdName = m.body.slice(1).split(' ')[0].toLowerCase();
        if (cmdName === 'dalle3') {
            model = 'dalle3';
        } else if (cmdName === 'flux') {
            model = 'flux';
        }

        try {
            await m.react('⏳');

            const buffer = await drawImage(prompt, model);

            await sock.sendMessage(
                m.from,
                { image: buffer, caption: `✨ *AI IMAGE GENERATOR*\n\n📝 *Prompt*: ${prompt}\n🤖 *Model*: ${model}` },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error saat draw:', err);
            await m.react('❌');
            await m.reply(`Gagal menghasilkan gambar: ${err.message}`);
        }
    }
};

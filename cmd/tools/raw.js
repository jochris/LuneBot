export default {
    name: 'raw',
    aliases: ['rawmsg', 'rawmessage'],
    description: 'Menampilkan data JSON mentah (raw) dari pesan yang di-reply.',
    category: 'tools',
    async execute(sock, m, args) {
        const target = m.quoted ? m.quoted.raw : m.raw;

        if (!target) {
            await m.reply('Silakan reply pesan yang ingin Anda ambil data mentahnya.');
            return;
        }

        try {
            const jsonStr = JSON.stringify(target, null, 2);

            if (jsonStr.length < 3000) {
                await m.reply(`\`\`\`json\n${jsonStr}\n\`\`\``);
            } else {
                await sock.sendMessage(m.from, {
                    document: Buffer.from(jsonStr),
                    fileName: `raw_${target.key?.id || 'message'}.json`,
                    mimetype: 'application/json',
                    caption: 'Pesan raw terlalu panjang, dikirim sebagai file JSON.'
                }, { quoted: m.raw });
            }
        } catch (err) {
            console.error('Error saat mengambil raw message:', err);
            await m.reply(`✗ Gagal mengambil data mentah: ${err.message}`);
        }
    }
};

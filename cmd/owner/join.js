export default {
    name: 'join',
    description: 'Menyuruh bot bergabung ke grup via link undangan.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        const link = args[0];
        if (!link) {
            await m.reply('Silakan masukkan link grup WhatsApp atau kode undangan. Contoh: .join https://chat.whatsapp.com/CodeHere');
            return;
        }

        const inviteRegex = /chat\.whatsapp\.com\/([a-zA-Z0-9\-]+)/i;
        const match = link.match(inviteRegex);
        const code = match ? match[1] : link;

        try {
            const response = await sock.groupAcceptInvite(code);
            if (response) {
                await m.reply('Berhasil bergabung ke grup!');
            } else {
                await m.reply('Proses bergabung berhasil dijalankan.');
            }
        } catch (err) {
            console.error(err);
            await m.reply(`Gagal bergabung ke grup: ${err.message || err}`);
        }
    }
};

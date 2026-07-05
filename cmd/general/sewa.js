export default {
    name: 'sewa',
    aliases: ['rent', 'sewabot', 'belisc', 'script', 'sc'],
    description: 'Menampilkan informasi harga sewa bot dan pembelian script.',
    category: 'general',
    async execute(sock, m, args) {
        const configRent = global.config.rent;
        if (!configRent) {
            await m.reply('Konfigurasi sewa bot belum disetel.');
            return;
        }

        let text = `💳 *SEWA BOT & BELI SCRIPT* 🌙\n\n`;
        text += `🤖 *Harga Sewa Bot (Masuk Grup)*:\n➜ ${configRent.priceRent}\n\n`;
        text += `💻 *Harga Script Bot (Source Code)*:\n➜ ${configRent.priceScript}\n\n`;
        
        text += `✨ *Keuntungan & Fitur*:\n`;
        for (const benefit of configRent.benefits) {
            text += `• ${benefit}\n`;
        }
        text += `\n`;

        text += `💳 *Metode Pembayaran*:\n➜ ${configRent.paymentMethods}\n\n`;
        text += `📞 *Kontak Owner*:\n➜ ${configRent.contact}`;

        await m.reply(text.trim());
    }
};

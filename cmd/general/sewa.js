import { proto, generateWAMessageFromContent } from '@itsliaaa/baileys';

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

        let bodyText = `💳 *SEWA BOT & BELI SCRIPT* 🌙\n\n`;
        bodyText += `🤖 *Harga Sewa Bot (Masuk Grup)*:\n➜ ${configRent.priceRent}\n\n`;
        bodyText += `💻 *Harga Script Bot (Source Code)*:\n➜ ${configRent.priceScript}\n\n`;
        bodyText += `💳 *Metode Pembayaran*:\n➜ ${configRent.paymentMethods}\n\n`;
        bodyText += `📞 *Kontak Owner*:\n➜ ${configRent.contact}`;

        try {
            const msg = generateWAMessageFromContent(m.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "© Lune Bot Official" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "Sewa Bot & Beli Script", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "cta_url",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Hubungi Owner (WhatsApp)",
                                            url: "https://wa.me/62895416602000",
                                            merchant_url: "https://wa.me/62895416602000"
                                        })
                                    }
                                ]
                            })
                        })
                    }
                }
            }, { quoted: m.raw });

            await sock.relayMessage(m.from, msg.message, { messageId: msg.key.id });
        } catch (err) {
            console.error('Error saat mengirim pesan sewa:', err);
            await m.reply(bodyText);
        }
    }
};

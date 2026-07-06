import { proto, generateWAMessageFromContent } from '@itsliaaa/baileys';

export default {
    name: 'testbuttons',
    description: 'Mengirimkan pesan tombol interaktif untuk uji coba.',
    category: 'testing',
    forOwner: true,
    async execute(sock, m, args) {
        try {
            const msg = generateWAMessageFromContent(m.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: "Berikut adalah tombol interaktif untuk uji coba link dan telepon:" }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Lune Bot Buttons Test" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "Tombol Uji Coba", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "cta_url",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Kunjungi Website",
                                            url: "https://google.com",
                                            merchant_url: "https://google.com"
                                        })
                                    },
                                    {
                                        name: "cta_call",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Hubungi Owner",
                                            phone_number: "62895416602000"
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
            console.error('Error saat mengirim buttons message:', err);
            await m.reply('Gagal mengirimkan pesan tombol.');
        }
    }
};

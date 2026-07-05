import { proto, generateWAMessageFromContent } from '@itsliaaa/baileys';

export default {
    name: 'testreply',
    description: 'Mengirimkan tombol balas cepat (quick reply) untuk uji coba.',
    category: 'testing',
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
                            body: proto.Message.InteractiveMessage.Body.create({ text: "Pilih salah satu tombol di bawah untuk mengirim perintah cepat:" }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Lune Bot Reply Test" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "Balas Cepat (Quick Reply)", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Cek Latensi (Ping)",
                                            id: ".ping"
                                        })
                                    },
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Lihat Menu",
                                            id: ".menu"
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
            console.error('Error saat mengirim reply buttons message:', err);
            await m.reply('Gagal mengirimkan pesan tombol balas.');
        }
    }
};

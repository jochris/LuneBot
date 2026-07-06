import { proto, generateWAMessageFromContent } from '@itsliaaa/baileys';

export default {
    name: 'testcopy',
    description: 'Mengirimkan tombol salin teks untuk uji coba.',
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
                            body: proto.Message.InteractiveMessage.Body.create({ text: "Klik tombol di bawah ini untuk menyalin teks uji coba ke clipboard:" }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Lune Bot Copy Test" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "Salin Kode Uji Coba", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "cta_copy",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Salin Kode Voucher",
                                            copy_code: "LUNE-VOUCHER-ESM"
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
            console.error('Error saat mengirim copy message:', err);
            await m.reply('Gagal mengirimkan pesan salin.');
        }
    }
};

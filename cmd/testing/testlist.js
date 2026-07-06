import { proto, generateWAMessageFromContent } from '@itsliaaa/baileys';

export default {
    name: 'testlist',
    description: 'Mengirimkan pesan list interaktif untuk uji coba.',
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
                            body: proto.Message.InteractiveMessage.Body.create({ text: "Silakan pilih opsi dari list di bawah ini:" }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Lune Bot List Test" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "Daftar Pilihan Uji Coba", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "single_select",
                                        buttonParamsJson: JSON.stringify({
                                            title: "Buka Pilihan",
                                            sections: [
                                                {
                                                    title: "Pilihan Utama",
                                                    highlight_label: "Baru",
                                                    rows: [
                                                        {
                                                            header: "Opsi 1",
                                                            title: "Pilihan Pertama",
                                                            description: "Deskripsi pilihan pertama",
                                                            id: "pilihan_1"
                                                        },
                                                        {
                                                            header: "Opsi 2",
                                                            title: "Pilihan Kedua",
                                                            description: "Deskripsi pilihan kedua",
                                                            id: "pilihan_2"
                                                        }
                                                    ]
                                                }
                                            ]
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
            console.error('Error saat mengirim list message:', err);
            await m.reply('Gagal mengirimkan pesan list.');
        }
    }
};

import { generateWAMessageFromContent } from '@itsliaaa/baileys';

export default {
    name: 'testad',
    aliases: ['testinteractive', 'testiklan'],
    description: 'Mengirimkan simulasi pesan iklan interaktif (interactiveMessage).',
    category: 'testing',
    async execute(sock, m, args) {
        try {
            const protoMsg = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            header: {
                                title: 'Iklan Instagram (Simulasi)',
                                subtitle: 'Lihat detail iklan',
                                hasMediaAttachment: false
                            },
                            body: {
                                text: '¡Hola! Ini adalah simulasi pesan interaktif Klik-ke-WhatsApp (CTWA) yang dikirim oleh bot untuk pengujian tampilan.'
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: 'Lihat Detail',
                                            url: 'https://instagram.com'
                                        })
                                    }
                                ],
                                messageParamsJson: '{}'
                            }
                        }
                    }
                }
            };

            const msg = generateWAMessageFromContent(m.from, protoMsg, {
                quoted: m.raw
            });

            await sock.relayMessage(m.from, msg.message, {
                messageId: msg.key.id
            });

        } catch (err) {
            console.error('Error saat mengirim testad:', err);
            await m.reply(`✗ Gagal mengirim pesan interaktif: ${err.message}`);
        }
    }
};

export default {
    name: 'testad',
    aliases: ['testinteractive', 'testiklan'],
    description: 'Mengirimkan simulasi pesan iklan interaktif (interactiveMessage).',
    category: 'testing',
    async execute(sock, m, args) {
        try {
            const message = {
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
            };

            await sock.sendMessage(m.from, {
                viewOnceMessage: { message }
            }, { quoted: m.raw });

        } catch (err) {
            console.error('Error saat mengirim testad:', err);
            await m.reply(`✗ Gagal mengirim pesan interaktif: ${err.message}`);
        }
    }
};

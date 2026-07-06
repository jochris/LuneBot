export default {
    name: 'testcarousel',
    description: 'Mengirimkan pesan carousel interaktif untuk uji coba.',
    category: 'testing',
    forOwner: true,
    async execute(sock, m, args) {
        const ownerNumber = process.env.OWNER_NUMBER || '62895416602000';

        try {
            await sock.sendMessage(m.from, { 
                text: '🗂️ Uji Coba Carousel Lune Bot', 
                footer: 'Lune Bot Carousel', 
                cards: [
                    { 
                        image: { url: 'https://picsum.photos/512/512' },
                        title: 'Kartu Pertama',
                        caption: 'Ini adalah kartu pertama yang berisi informasi produk ke-1.',
                        footer: 'Kartu 1',
                        nativeFlow: [
                            {
                                type: 'url',
                                text: 'Kunjungi Website',
                                url: 'https://astralune.cv'
                            },
                            {
                                type: 'call',
                                text: 'Hubungi Owner',
                                call: ownerNumber
                            }
                        ]
                    },
                    { 
                        image: { url: 'https://picsum.photos/512/512' },
                        title: 'Kartu Kedua',
                        caption: 'Ini adalah kartu kedua yang berisi informasi produk ke-2.',
                        footer: 'Kartu 2',
                        nativeFlow: [
                            {
                                type: 'url',
                                text: 'Kunjungi Website',
                                url: 'https://astralune.cv'
                            },
                            {
                                type: 'call',
                                text: 'Hubungi Owner',
                                call: ownerNumber
                            }
                        ]
                    }
                ] 
            }, { quoted: m.raw });
        } catch (err) {
            console.error('Error saat mengirim carousel message:', err);
            await m.reply('Gagal mengirimkan pesan carousel.');
        }
    }
};

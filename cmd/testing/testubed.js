import sharp from 'sharp';
import { generateWAMessageFromContent } from '@itsliaaa/baileys';

const imageUrl = 'https://storeapi.ubet.my.id/file/ubed-1779665887055.jpg';

const getThumb = async (url) => {
    const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error(`Gagal download thumbnail: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return sharp(buffer)
        .resize(200, 200)
        .jpeg({ quality: 45 })
        .toBuffer();
};

export default {
    name: 'testubed',
    description: 'Menguji coba tampilan pesan tombol gabungan v1 dengan gambar lokasi.',
    category: 'testing',
    async execute(sock, m, args) {
        try {
            const thumb = await getThumb(imageUrl);

            const menuJson = JSON.stringify({
                title: "📋 Pilih Opsi",
                sections: [
                    {
                        title: "Daftar Menu",
                        rows: [
                            { title: "Menu Pilihan 1", description: "Deskripsi 1", id: ".menu1" },
                            { title: "Menu Pilihan 2", description: "Deskripsi 2", id: ".menu2" }
                        ]
                    }
                ]
            });

            const finalButtons = [
                {
                    buttonId: 'menulist_id',
                    buttonText: { displayText: 'Klik di sini 📋' },
                    type: 1,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: menuJson
                    }
                },
                {
                    buttonId: '.menu',
                    buttonText: { displayText: 'Menu' },
                    type: 1
                },
                {
                    buttonId: '.owner',
                    buttonText: { displayText: 'Contact' },
                    type: 1
                }
            ];

            const msg = generateWAMessageFromContent(
                m.from,
                {
                    viewOnceMessage: {
                        message: {
                            buttonsMessage: {
                                locationMessage: {
                                    degreesLatitude: 0,
                                    degreesLongitude: 0,
                                    name: 'Ubed Official',
                                    address: 'Ubed',
                                    jpegThumbnail: thumb
                                },
                                contentText: 'ngetes aja sih!',
                                footerText: '© Ubed Official',
                                buttons: finalButtons,
                                headerType: 6
                            }
                        }
                    }
                },
                { quoted: m.raw }
            );

            await sock.relayMessage(m.from, msg.message, {
                messageId: msg.key.id
            });

        } catch (e) {
            console.error(e);
            await m.reply(`Error:\n${e.message}`);
        }
    }
};

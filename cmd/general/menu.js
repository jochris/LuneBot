import sharp from 'sharp';
import { generateWAMessageFromContent } from '@itsliaaa/baileys';

const imageUrl = 'https://cloud.yardansh.com/JqRZzf.jpg';

const getThumb = async (url) => {
    const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error(`Gagal download thumbnail: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return sharp(buffer)
        .resize(300, 300, {
            fit: 'inside'
        })
        .jpeg({ quality: 90 })
        .toBuffer();
};

export default {
    name: 'menu',
    aliases: ['help', 'h'],
    description: 'Menampilkan semua daftar perintah yang tersedia.',
    category: 'general',
    async execute(sock, m, args, commands) {
        const botName = process.env.BOT_NAME || 'LuneBot';
        const prefix = process.env.PREFIX || '.';
        
        let senderPhone = m.sender.split('@')[0];
        let senderJid = m.sender;

        if (m.isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(m.from);
                const participant = groupMetadata.participants.find(p => p.id === m.sender);
                if (participant && participant.phoneNumber) {
                    senderPhone = participant.phoneNumber.split('@')[0];
                    senderJid = participant.phoneNumber;
                }
            } catch (err) {
                console.error('Error resolving sender phone number in menu:', err);
            }
        }

        const categories = {};
        const uniqueCommands = new Set(commands.values());
        for (const cmd of uniqueCommands) {
            const cat = cmd.category || 'other';
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push(cmd);
        }

        const categoryEmojis = {
            general: '⚙️',
            maker: '🎨',
            downloader: '📥',
            group: '👥',
            owner: '👑',
            search: '🔍',
            testing: '🧪',
            other: '📂'
        };

        let menuText = `Halo @${senderPhone}!\n\nBerikut adalah daftar perintah yang tersedia:\n\n`;
        for (const [category, cmds] of Object.entries(categories)) {
            const emote = categoryEmojis[category.toLowerCase()] || '📂';
            menuText += `*${emote} ${category.toUpperCase()}*\n`;
            for (const cmd of cmds) {
                menuText += `- ${prefix}${cmd.name}\n`;
            }
            menuText += `\n`;
        }
        menuText = menuText.trim();

        const finalButtons = [
            {
                buttonId: `${prefix}owner`,
                buttonText: { displayText: 'Hubungi Owner' },
                type: 1
            },
            {
                buttonId: 'menu_web_id',
                buttonText: { displayText: 'www.astralune.cv' },
                type: 1,
                nativeFlowInfo: {
                    name: 'cta_url',
                    paramsJson: JSON.stringify({
                        display_text: 'www.astralune.cv',
                        url: 'https://astralune.cv',
                        merchant_url: 'https://astralune.cv'
                    })
                }
            }
        ];

        try {
            const thumb = await getThumb(imageUrl);

            const msg = generateWAMessageFromContent(
                m.from,
                {
                    viewOnceMessage: {
                        message: {
                            buttonsMessage: {
                                locationMessage: {
                                    degreesLatitude: 0,
                                    degreesLongitude: 0,
                                    name: botName,
                                    address: 'Lune Bot Menu',
                                    jpegThumbnail: thumb
                                },
                                contentText: menuText,
                                footerText: `© ${botName} Official`,
                                buttons: finalButtons,
                                headerType: 6,
                                contextInfo: {
                                    mentionedJid: [m.sender, senderJid]
                                }
                            }
                        }
                    }
                },
                { 
                    quoted: m.raw,
                    mentions: [m.sender, senderJid]
                }
            );

            await sock.relayMessage(m.from, msg.message, { messageId: msg.key.id });
        } catch (err) {
            console.error('Error saat mengirim menu interactive message:', err);
            await m.reply(menuText, { mentions: [m.sender, senderJid] });
        }
    }
};

export default {
    name: 'owner',
    description: 'Menampilkan informasi owner/pemilik bot.',
    category: 'general',
    async execute(sock, m, args) {
        const botName = process.env.BOT_NAME || 'LuneBot';
        const ownerNumber = process.env.OWNER_NUMBER || '62895416602000';
        const ownerName = `Owner ${botName}`;

        const vcard = `BEGIN:VCARD\n`
            + `VERSION:3.0\n`
            + `FN:${ownerName}\n`
            + `ORG:${botName} Creator;\n`
            + `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n`
            + `END:VCARD`;

        await sock.sendMessage(
            m.from,
            { 
                contacts: { 
                    displayName: ownerName, 
                    contacts: [{ vcard }] 
                }
            },
            { quoted: m.raw }
        );
    }
};

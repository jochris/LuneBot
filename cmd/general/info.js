import { db } from '#lib/db';
import os from 'os';

export default {
    name: 'info',
    description: 'Menampilkan informasi sistem dan status bot.',
    category: 'general',
    async execute(sock, m, args) {
        const botName = process.env.BOT_NAME || 'LuneBot';
        
        const totalGroups = db.query('SELECT COUNT(*) AS count FROM groups').get().count;
        const totalContacts = db.query('SELECT COUNT(*) AS count FROM contacts').get().count;

        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeStr = `${hours} jam, ${minutes} menit, ${seconds} detik`;

        const memory = process.memoryUsage();
        const heapUsedMB = (memory.heapUsed / 1024 / 1024).toFixed(2);
        
        const platform = os.platform();
        const architecture = os.arch();
        
        let infoText = `*${botName} - Status & Informasi*\n\n`;
        infoText += `💻 *Platform*: ${platform} (${architecture})\n`;
        infoText += `🚀 *Runtime*: Bun v${process.versions.bun || 'N/A'} (Node ${process.version})\n`;
        infoText += `📟 *Penggunaan Memori*: ${heapUsedMB} MB\n`;
        infoText += `⏱️ *Uptime*: ${uptimeStr}\n\n`;
        infoText += `📊 *Statistik Database*:\n`;
        infoText += `- Grup Tersimpan: ${totalGroups}\n`;
        infoText += `- Kontak Tersimpan: ${totalContacts}\n`;

        await m.reply(infoText.trim());
    }
};

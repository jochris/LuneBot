import { db } from '#lib/db';
import os from 'os';

export default {
    name: 'info',
    description: 'Menampilkan informasi sistem dan status bot.',
    category: 'general',
    async execute(sock, m, args, commands) {
        const botName = process.env.BOT_NAME || 'LuneBot';
        
        const totalGroups = db.query('SELECT COUNT(*) AS count FROM groups').get().count;
        const totalContacts = db.query('SELECT COUNT(*) AS count FROM contacts').get().count;
        const totalSettings = db.query('SELECT COUNT(*) AS count FROM settings').get().count;

        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        
        let uptimeStr = '';
        if (days > 0) uptimeStr += `${days} hari, `;
        if (hours > 0) uptimeStr += `${hours} jam, `;
        uptimeStr += `${minutes} menit, ${seconds} detik`;

        const memory = process.memoryUsage();
        const rssMB = (memory.rss / 1024 / 1024).toFixed(2);
        const heapUsedMB = (memory.heapUsed / 1024 / 1024).toFixed(2);
        
        const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const cpus = os.cpus();
        const cpuModel = cpus && cpus.length > 0 ? cpus[0].model.trim() : 'Unknown CPU';
        const cpuCores = cpus ? cpus.length : 0;

        const platform = os.platform();
        const release = os.release();
        const architecture = os.arch();
        
        const totalCmds = commands ? new Set(commands.values()).size : 0;
        
        const botJid = sock.user ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : 'N/A';
        const botNumber = sock.user ? sock.user.id.split(':')[0] : 'N/A';
        const botPushName = sock.user ? sock.user.name : 'N/A';

        let infoText = `🤖 *${botName} - STATUS & INFORMASI SISTEM* 🌙\n\n`;
        
        infoText += `💬 *INFORMASI AKUN BOT*:\n`;
        infoText += ` ├ • *Nama Bot*: ${botPushName}\n`;
        infoText += ` ├ • *Nomor Bot*: +${botNumber}\n`;
        infoText += ` ├ • *JID Bot*: ${botJid}\n`;
        infoText += ` └ • *Owner*: +${process.env.OWNER_NUMBER || 'N/A'}\n\n`;

        infoText += `💻 *SPESIFIKASI HOST / OS*:\n`;
        infoText += ` ├ • *OS Platform*: ${platform} (${architecture})\n`;
        infoText += ` ├ • *OS Release*: ${release}\n`;
        infoText += ` ├ • *CPU*: ${cpuModel} (${cpuCores} Cores)\n`;
        infoText += ` └ • *RAM Host*: ${freeMemGB} GB free / ${totalMemGB} GB total\n\n`;

        infoText += `🚀 *RUNTIME & MEMORY BOT*:\n`;
        infoText += ` ├ • *Runtime*: Bun v${process.versions.bun || 'N/A'} (Node ${process.version})\n`;
        infoText += ` ├ • *Uptime*: ${uptimeStr}\n`;
        infoText += ` ├ • *RSS Memory*: ${rssMB} MB\n`;
        infoText += ` └ • *Heap Used*: ${heapUsedMB} MB\n\n`;

        infoText += `📊 *STATISTIK BOT & DATABASE*:\n`;
        infoText += ` ├ • *Total Command*: ${totalCmds} fitur termuat\n`;
        infoText += ` ├ • *Total Kontak*: ${totalContacts} kontak terindeks\n`;
        infoText += ` ├ • *Total Grup*: ${totalGroups} grup terindeks\n`;
        infoText += ` └ • *Pengaturan DB*: ${totalSettings} data konfigurasi\n\n`;
        
        infoText += `⏰ _Waktu Server: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB_`;

        await m.reply(infoText.trim());
    }
};

import fs from 'fs';
import os from 'os';

export default {
    name: 'info',
    description: 'Menampilkan informasi status runtime dan penggunaan memori bot.',
    category: 'general',
    async execute(sock, m, args) {
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

        let swapTotal = 'N/A';
        let swapUsed = 'N/A';

        try {
            if (os.platform() === 'linux') {
                const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
                const lines = meminfo.split('\n');
                const totalLine = lines.find(l => l.startsWith('SwapTotal:'));
                const freeLine = lines.find(l => l.startsWith('SwapFree:'));
                if (totalLine && freeLine) {
                    const totalKb = parseInt(totalLine.replace(/[^0-9]/g, ''), 10);
                    const freeKb = parseInt(freeLine.replace(/[^0-9]/g, ''), 10);
                    const usedKb = totalKb - freeKb;
                    
                    swapTotal = `${(totalKb / 1024).toFixed(2)} MB`;
                    swapUsed = `${(usedKb / 1024).toFixed(2)} MB`;
                }
            }
        } catch {
        }

        const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

        const platform = os.platform();
        const architecture = os.arch();

        let infoText = '';
        infoText += `💻 *Platform*: ${platform} (${architecture})\n`;
        infoText += `🚀 *Runtime*: Bun v${process.versions.bun || 'N/A'} (Node ${process.version})\n`;
        infoText += `⏱️ *Uptime*: ${uptimeStr}\n`;
        infoText += `📟 *RSS Memory*: ${rssMB} MB\n`;
        infoText += `📈 *Heap Used*: ${heapUsedMB} MB\n`;
        infoText += `💾 *RAM Host*: ${freeMemGB} GB free / ${totalMemGB} GB total\n`;
        if (os.platform() === 'linux') {
            infoText += `🔄 *Swap Host*: ${swapUsed} used / ${swapTotal} total\n`;
        }
        infoText += `⏰ _Waktu Server: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB_`;

        await m.reply(infoText.trim());
    }
};

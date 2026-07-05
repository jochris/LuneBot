export default {
    name: 'runtime',
    description: 'Melihat seberapa lama bot telah aktif.',
    category: 'general',
    async execute(sock, m, args) {
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        await m.reply(`⏱️ *Uptime Bot*:\n${hours} jam, ${minutes} menit, ${seconds} detik`);
    }
};

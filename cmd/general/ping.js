export default {
    name: 'ping',
    description: 'Mengukur kecepatan respon bot.',
    category: 'general',
    async execute(sock, m, args) {
        const startTime = Date.now();
        const sentMsg = await m.reply('Menghitung kecepatan...');
        const endTime = Date.now();
        await sock.sendMessage(m.from, {
            text: `Pong! Kecepatan respon: ${endTime - startTime}ms`,
            edit: sentMsg.key
        });
    }
};

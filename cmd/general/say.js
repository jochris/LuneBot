export default {
    name: 'say',
    description: 'Menyuruh bot menirukan pesan Anda.',
    category: 'general',
    async execute(sock, m, args) {
        const textToSay = args.join(' ');
        const prefix = process.env.PREFIX || '.';
        if (!textToSay) {
            await m.reply(`Silakan masukkan pesan yang ingin diucapkan. Contoh: ${prefix}say Halo Dunia`);
        } else {
            await m.reply(textToSay);
        }
    }
};

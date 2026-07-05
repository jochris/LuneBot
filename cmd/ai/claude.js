import crypto from 'crypto';
import { chatWithClaude } from '../../scrape/ai.js';

export default {
    name: 'claude',
    aliases: [],
    description: 'Tanya jawab dengan Claude AI (mendukung sesi percakapan per pengguna).',
    category: 'ai',
    async execute(sock, m, args) {
        const option = args[0] ? args[0].toLowerCase() : '';
        const sessionId = crypto.createHash('md5').update(m.sender).digest('hex');

        if (option === 'reset' || option === 'clear') {
            try {
                await chatWithClaude('', sessionId, true);
                await m.reply(global.config.responses.aiReset);
            } catch (err) {
                console.error('Error saat reset AI session:', err);
                await m.reply(`Gagal mereset sesi AI: ${err.message}`);
            }
            return;
        }

        let prompt = args.join(' ');
        if (!prompt && m.quoted && m.quoted.body) {
            prompt = m.quoted.body;
        }

        if (!prompt) {
            await m.reply(global.config.responses.aiHelp);
            return;
        }

        try {
            const res = await chatWithClaude(prompt.trim(), sessionId, false);
            const replyText = res.reply || 'Tidak ada tanggapan.';
            await m.reply(replyText);
        } catch (err) {
            console.error('Error Claude AI:', err);
            await m.reply(`Gagal memproses permintaan AI: ${err.message}`);
        }
    }
};

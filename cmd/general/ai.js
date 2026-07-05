import crypto from 'crypto';

export default {
    name: 'ai',
    aliases: ['claude'],
    description: 'Tanya jawab dengan Claude AI (mendukung sesi percakapan per pengguna).',
    category: 'general',
    async execute(sock, m, args) {
        const option = args[0] ? args[0].toLowerCase() : '';
        const sessionId = crypto.createHash('md5').update(m.sender).digest('hex');

        if (option === 'reset' || option === 'clear') {
            try {
                const apiUrl = `https://myapi.astralune.cv/api/v1/ai/claude?prompt=reset&session_id=${sessionId}&reset=1`;
                const res = await fetch(apiUrl);
                if (!res.ok) {
                    throw new Error(`API returned HTTP ${res.status}`);
                }
                const json = await res.json();
                if (!json.status) {
                    throw new Error(json.message || 'Gagal mereset sesi.');
                }

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
            const apiUrl = `https://myapi.astralune.cv/api/v1/ai/claude?prompt=${encodeURIComponent(prompt.trim())}&session_id=${sessionId}`;
            const res = await fetch(apiUrl);
            if (!res.ok) {
                throw new Error(`API returned HTTP ${res.status}`);
            }

            const json = await res.json();
            if (!json.status || !json.data) {
                throw new Error(json.message || 'Gagal mendapatkan tanggapan dari AI.');
            }

            const replyText = json.data.reply || 'Tidak ada tanggapan.';
            await m.reply(replyText);
        } catch (err) {
            console.error('Error Claude AI:', err);
            await m.reply(`Gagal memproses permintaan AI: ${err.message}`);
        }
    }
};

import crypto from 'crypto';
import { chatMultimodel } from '../../scrape/aichatting.js';

export default {
    name: 'gpt',
    aliases: ['gemini', 'sonnet', 'vision'],
    description: 'Tanya jawab dengan GPT-4o, Gemini Pro, atau Claude 3.5 Sonnet (mendukung gambar/vision).',
    category: 'ai',
    async execute(sock, m, args) {
        const cmdName = m.body.slice(1).split(' ')[0].toLowerCase();
        let model = 'gpt-4o-mini';

        if (cmdName === 'gemini') {
            model = 'gemini-1.5-pro';
        } else if (cmdName === 'sonnet') {
            model = 'claude-3-5-sonnet';
        } else if (cmdName === 'vision') {
            model = 'gpt-4o';
        }

        const option = args[0] ? args[0].toLowerCase() : '';
        const sessionId = crypto.createHash('md5').update(m.sender).digest('hex');

        if (option === 'reset' || option === 'clear') {
            try {
                await chatMultimodel('', sessionId, model, null, null, true);
                await m.reply(`Sesi obrolan AI (${cmdName.toUpperCase()}) berhasil di-reset!`);
            } catch (err) {
                console.error('Error saat reset AI session:', err);
                await m.reply(`Gagal mereset sesi: ${err.message}`);
            }
            return;
        }

        let prompt = args.join(' ');
        if (!prompt && m.quoted && m.quoted.body) {
            prompt = m.quoted.body;
        }

        const isImage = m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');

        if (!prompt && !isImage) {
            await m.reply(`Silakan masukkan pertanyaan kamu. Contoh:\n*.${cmdName} jelaskan arti hidup*\nBalas/kirim gambar dengan caption *.${cmdName} apa isi gambar ini?* untuk menganalisis gambar.`);
            return;
        }

        try {
            await m.react('⏳');

            let imageBuffer = null;
            let mimeType = null;

            if (isImage) {
                imageBuffer = await m.download();
                mimeType = m.type === 'imageMessage' ? m.msg?.mimetype : m.quoted.msg?.mimetype;
            }

            const res = await chatMultimodel(prompt || 'Jelaskan gambar ini', sessionId, model, imageBuffer, mimeType, false);
            const replyText = res.answer || 'Tidak ada tanggapan.';
            await m.reply(replyText);
            await m.react('✅');
        } catch (err) {
            console.error('Error AI Chat:', err);
            await m.react('❌');
            await m.reply(`Gagal memproses permintaan AI: ${err.message}`);
        }
    }
};

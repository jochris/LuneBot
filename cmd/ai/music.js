import { generateUUID, login, createMusic, getProgress } from '../../scrape/music.js';

export default {
    name: 'aimusic',
    aliases: ['musicai', 'suno'],
    description: 'Menghasilkan lagu/musik kustom menggunakan AI.',
    category: 'ai',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan prompt deskripsi musik yang ingin dibuat. Contoh: .aimusic energetic J-pop with female vocals about summer');
            return;
        }

        const prompt = args.join(' ');

        try {
            await m.react('⏳');
            const statusMsg = await sock.sendMessage(m.from, { text: '⏳ Menghubungkan ke server AI...' }, { quoted: m.raw });

            const identityId = generateUUID();
            const token = await login(identityId);

            await sock.sendMessage(m.from, { edit: statusMsg.key, text: '⏳ Mengirimkan perintah pembuatan musik...' });

            const createdIds = await createMusic({
                prompt: prompt,
                title: 'Lune Song',
                isInstrumental: 0,
                modelId: 6
            }, identityId, token);

            if (!createdIds || !createdIds.length) {
                throw new Error('Gagal mengirimkan tugas pembuatan musik ke server.');
            }

            const taskId = createdIds[0];
            let completedData = null;
            const maxPoll = 40;
            const pollDelayMs = 5000;

            for (let i = 0; i < maxPoll; i++) {
                await sock.sendMessage(m.from, { edit: statusMsg.key, text: `⏳ Sedang memproses dan merender lagu... (${Math.round(((i + 1) / maxPoll) * 100)}%)` });
                await new Promise(resolve => setTimeout(resolve, pollDelayMs));
                const progress = await getProgress(taskId, identityId, token);
                if (progress && progress.music_file) {
                    completedData = progress;
                    break;
                }
            }

            if (!completedData || !completedData.music_file) {
                throw new Error('Timeout! Proses pembuatan musik melebihi batas waktu (3 menit).');
            }

            await sock.sendMessage(m.from, { edit: statusMsg.key, text: '⏳ Mengunduh berkas audio hasil render...' });

            const coverUrl = completedData.cover || completedData.image_url || '';
            const lyrics = completedData.lyrics || '';
            const title = completedData.title || 'Lune AI Song';
            const audioUrl = completedData.music_file;

            let captionText = `🎵 *AI MUSIC GENERATED* 🎵\n\n`;
            captionText += `📝 *Judul*: ${title}\n`;
            captionText += `💬 *Prompt*: ${prompt}\n\n`;
            if (lyrics) {
                captionText += `📜 *Lirik*:\n${lyrics}`;
            }

            const audioRes = await fetch(audioUrl);
            if (!audioRes.ok) {
                throw new Error(`Gagal mengunduh berkas audio lagu: HTTP ${audioRes.status}`);
            }
            const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

            await sock.sendMessage(m.from, { edit: statusMsg.key, text: captionText });

            await sock.sendMessage(
                m.from,
                { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: false },
                { quoted: m.raw }
            );

            await m.react('✅');
        } catch (err) {
            console.error('Error AI Music:', err);
            await m.react('❌');
            await m.reply(`Gagal memproses lagu AI: ${err.message}`);
        }
    }
};

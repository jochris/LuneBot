import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function webpToMp4(webpBuffer) {
    const gifBuffer = await sharp(webpBuffer, { animated: true })
        .gif()
        .toBuffer();

    const tempGif = path.join('/tmp', `gif_${Date.now()}.gif`);
    const tempMp4 = path.join('/tmp', `mp4_${Date.now()}.mp4`);
    
    fs.writeFileSync(tempGif, gifBuffer);
    
    try {
        await execAsync(`ffmpeg -y -i ${tempGif} -pix_fmt yuv420p -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black" ${tempMp4}`);
        const mp4Buffer = fs.readFileSync(tempMp4);
        return mp4Buffer;
    } finally {
        try { fs.unlinkSync(tempGif); } catch {}
        try { fs.unlinkSync(tempMp4); } catch {}
    }
}

export default {
    name: 'tovid',
    aliases: ['tomp4', 'tovideo'],
    description: 'Mengubah stiker animasi menjadi video MP4.',
    category: 'maker',
    async execute(sock, m, args) {
        const isSticker = m.type === 'stickerMessage';
        const isQuotedSticker = m.quoted && m.quoted.type === 'stickerMessage';

        if (!isSticker && !isQuotedSticker) {
            await m.reply('Silakan balas (reply) stiker animasi yang ingin diubah menjadi video.');
            return;
        }

        try {
            await m.react('⏳');
            const buffer = await m.download();
            
            const mp4Buffer = await webpToMp4(buffer);

            await sock.sendMessage(m.from, { video: mp4Buffer, caption: 'Sukses mengubah stiker menjadi video!' }, { quoted: m.raw });
            await m.react('✅');
        } catch (err) {
            console.error('Error saat konversi stiker ke video:', err);
            await m.react('❌');
            await m.reply(`Gagal mengubah stiker menjadi video: ${err.message}`);
        }
    }
};

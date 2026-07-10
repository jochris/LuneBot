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

async function videoToGif(videoBuffer) {
    const tempInput = path.join('/tmp', `video_${Date.now()}.mp4`);
    const tempOutput = path.join('/tmp', `gifvid_${Date.now()}.mp4`);
    
    fs.writeFileSync(tempInput, videoBuffer);
    
    try {
        await execAsync(`ffmpeg -y -i ${tempInput} -t 15 -an -pix_fmt yuv420p -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black" ${tempOutput}`);
        const mp4Buffer = fs.readFileSync(tempOutput);
        return mp4Buffer;
    } finally {
        try { fs.unlinkSync(tempInput); } catch {}
        try { fs.unlinkSync(tempOutput); } catch {}
    }
}

export default {
    name: 'togif',
    aliases: ['gif'],
    description: 'Mengubah stiker animasi atau video (maks 15s) menjadi GIF (video melingkar/loop).',
    category: 'maker',
    async execute(sock, m, args) {
        const isSticker = m.type === 'stickerMessage';
        const isQuotedSticker = m.quoted && m.quoted.type === 'stickerMessage';
        const isVideo = m.type === 'videoMessage';
        const isQuotedVideo = m.quoted && m.quoted.type === 'videoMessage';

        if (!isSticker && !isQuotedSticker && !isVideo && !isQuotedVideo) {
            await m.reply('Silakan balas (reply) stiker animasi atau video yang ingin diubah menjadi GIF.');
            return;
        }

        try {
            await m.react('⏳');
            
            if (isVideo || isQuotedVideo) {
                const targetMsg = isVideo ? m.msg : m.quoted.msg;
                const duration = targetMsg?.seconds || 0;
                
                if (duration > 15) {
                    await m.react('❌');
                    await m.reply('Durasi video terlalu panjang! Maksimal durasi untuk dijadikan GIF adalah 15 detik.');
                    return;
                }
                
                const buffer = await m.download();
                const mp4Buffer = await videoToGif(buffer);
                
                await sock.sendMessage(m.from, { video: mp4Buffer, gifPlayback: true }, { quoted: m.raw });
            } else {
                const buffer = await m.download();
                const mp4Buffer = await webpToMp4(buffer);
                
                await sock.sendMessage(m.from, { video: mp4Buffer, gifPlayback: true }, { quoted: m.raw });
            }
            
            await m.react('✅');
        } catch (err) {
            console.error('Error saat konversi stiker/video ke GIF:', err);
            await m.react('❌');
            await m.reply(`Gagal mengubah menjadi GIF: ${err.message}`);
        }
    }
};

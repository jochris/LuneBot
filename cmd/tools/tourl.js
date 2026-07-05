import { uploadToShaqCloud, BANNED_EXT, getExt } from '../../scrape/uploader.js';
import { fileTypeFromBuffer } from 'file-type';
import { proto, generateWAMessageFromContent } from '@itsliaaa/baileys';

function formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    name: 'tourl',
    aliases: ['upload', 'uploader'],
    description: 'Mengunggah media ke Shaq Cloud dan menghasilkan tautan URL dengan tombol salin.',
    category: 'tools',
    async execute(sock, m, args) {
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        const isSelfMedia = mediaTypes.includes(m.type);
        const isQuotedMedia = m.quoted && mediaTypes.includes(m.quoted.type);

        if (!isSelfMedia && !isQuotedMedia) {
            await m.reply('Silakan kirim media (gambar/video/audio/stiker/dokumen) dengan caption *.tourl* atau balas (reply) media tersebut.');
            return;
        }

        try {
            await m.react('⏳');

            const buffer = await m.download();
            if (!buffer || buffer.length === 0) {
                throw new Error('Gagal mengunduh media dari WhatsApp.');
            }

            const ft = await fileTypeFromBuffer(buffer);
            const ext = ft ? ft.ext : 'bin';
            const mime = ft ? ft.mime : 'application/octet-stream';
            const filename = `upload_${Date.now()}.${ext}`;

            const checkExt = getExt(filename);
            if (BANNED_EXT.has(checkExt)) {
                throw new Error(`Ekstensi '${checkExt}' diblokir (executable)`);
            }

            const result = await uploadToShaqCloud(buffer, filename, mime);
            if (!result || !result.success || !result.url) {
                throw new Error(result?.error || 'Upstream tidak mengembalikan URL');
            }

            const url = result.url;
            const sizeStr = formatSize(result.size || buffer.length);

            let bodyText = `☁️ *SHAQ CLOUD UPLOADER*\n\n`;
            bodyText += `📝 *Nama*: ${result.originalName || filename}\n`;
            bodyText += `📦 *Ukuran*: ${sizeStr}\n`;
            bodyText += `🏷️ *Mime*: ${mime}`;

            const msg = generateWAMessageFromContent(m.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Lune Bot Uploader" }),
                            header: proto.Message.InteractiveMessage.Header.create({ title: "Tautan File Berhasil Dibuat", hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "cta_copy",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Salin URL",
                                            copy_code: url
                                        })
                                    }
                                ]
                            })
                        })
                    }
                }
            }, { quoted: m.raw });

            await sock.relayMessage(m.from, msg.message, { messageId: msg.key.id });
            await m.react('✅');
        } catch (err) {
            console.error('Error saat upload ke Shaq Cloud:', err);
            await m.react('❌');
            await m.reply(`Gagal mengunggah file ke Shaq Cloud: ${err.message}`);
        }
    }
};

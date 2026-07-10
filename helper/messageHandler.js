import { serialize } from './serialize.js';
import { getGroup, saveGroup, getSetting, getGroupParticipants } from '#lib/store';
import { isOwnerJid, normalizeJid } from '#helper/jid';
import { isPendingMessage } from '#helper/pendingMessage';
import { exec } from 'child_process';
import { checkAndResponseHama, addHama } from './hama.js';
import { isGroupBanned } from './bannedGroups.js';
import { pendingSwgc } from '#helper/pendingSwgc';
import { pendingHamaSticker } from '#helper/pendingHama';
import fs from 'fs';
import path from 'path';

const processedMessages = new Set();

/**
 * Handles incoming WhatsApp messages, filters duplicates,
 * updates group metadata caches, and routes commands.
 * 
 * @param {import('@itsliaaa/baileys').WASocket} sock Baileys socket instance
 * @param {import('@itsliaaa/baileys').proto.IWebMessageInfo} rawMsg Raw WhatsApp message
 * @param {Map} commands Map of loaded commands
 */
export async function handleMessage(sock, rawMsg, commands) {
    try {
        const m = serialize(sock, rawMsg);
        if (!m) return;

        if (isPendingMessage(m)) return;

        if (processedMessages.has(m.id)) return;
        processedMessages.add(m.id);
        if (processedMessages.size > 200) {
            const first = processedMessages.values().next().value;
            processedMessages.delete(first);
        }

        await checkAndResponseHama(sock, m);

        const isOwner = isOwnerJid(m.sender);

        if (isOwner) {
            const senderHash = normalizeJid(m.sender);
            const pendingHama = pendingHamaSticker.get(senderHash);

            if (pendingHama && (Date.now() - pendingHama.timestamp < 300000)) {
                const isSticker = m.type === 'stickerMessage';
                const isQuotedSticker = m.quoted && m.quoted.type === 'stickerMessage';

                if (isSticker || isQuotedSticker) {
                    try {
                        const buffer = await m.download();
                        const targetJid = pendingHama.targetJid;
                        
                        const stickerDir = path.join('./cache', 'hama_stickers');
                        if (!fs.existsSync(stickerDir)) {
                            fs.mkdirSync(stickerDir, { recursive: true });
                        }

                        const stickerPath = path.join(stickerDir, `${targetJid}.webp`);
                        fs.writeFileSync(stickerPath, buffer);

                        addHama(targetJid, `sticker:${stickerPath}`);
                        pendingHamaSticker.delete(senderHash);

                        await m.reply(`✓ Berhasil mengonfigurasi respons stiker untuk target hama @${targetJid.split('@')[0]}!`, {
                            mentions: [targetJid]
                        });
                        return;
                    } catch (err) {
                        console.error('Error saat menyimpan stiker respons hama:', err);
                        await m.reply(`✗ Gagal mengonfigurasi stiker respons hama: ${err.message}`);
                        return;
                    }
                }
            }
        }

        if (m.body && isOwner) {
            const senderHash = normalizeJid(m.sender);
            const session = pendingSwgc.get(senderHash);

            if (session && (Date.now() - session.timestamp < 300000)) {
                const cleanBody = m.body.trim();
                const isNumericList = /^[0-9\s,]+$/.test(cleanBody);

                if (isNumericList) {
                    const choices = cleanBody.split(',')
                        .map(s => parseInt(s.trim(), 10))
                        .filter(n => !isNaN(n));

                    const targetJids = [];
                    const targetNames = [];
                    const invalidChoices = [];

                    for (const choice of choices) {
                        const index = choice - 1;
                        if (index >= 0 && index < session.groups.length) {
                            const group = session.groups[index];
                            if (!targetJids.includes(group.id)) {
                                targetJids.push(group.id);
                                targetNames.push(group.subject || group.id);
                            }
                        } else {
                            invalidChoices.push(choice);
                        }
                    }

                    if (targetJids.length > 0) {
                        let successCount = 0;
                        const failedGroups = [];

                        for (const groupJid of targetJids) {
                            try {
                                await sock.sendMessage(groupJid, session.content);
                                successCount++;
                            } catch (err) {
                                console.error(`Failed to send SWGC to ${groupJid}:`, err);
                                const groupInfo = getGroup(groupJid);
                                failedGroups.push(groupInfo ? groupInfo.subject : groupJid);
                            }
                        }

                        pendingSwgc.delete(senderHash);

                        let replyText = `✓ Berhasil mengirimkan SWGC ke *${successCount}* grup:\n${targetNames.map(name => `- ${name}`).join('\n')}`;
                        if (failedGroups.length > 0) {
                            replyText += `\n\n✗ Gagal mengirim ke grup: ${failedGroups.join(', ')}`;
                        }
                        if (invalidChoices.length > 0) {
                            replyText += `\n\n⚠ Catatan: Pilihan nomor ${invalidChoices.join(', ')} tidak valid dan dilewati.`;
                        }
                        await m.reply(replyText);
                        return;
                    } else {
                        await m.reply('Pilihan nomor grup tidak valid. Silakan masukkan nomor yang tertera pada list.');
                        return;
                    }
                }
            }
        }
        if (m.isGroup && isGroupBanned(m.from) && !isOwner) {
            return;
        }

        if (m.isGroup) {
            const group = getGroup(m.from);
            if (!group) {
                try {
                    const metadata = await sock.groupMetadata(m.from);
                    saveGroup(metadata.id, metadata.subject, metadata.owner, metadata.desc, metadata.participants);
                } catch {
                }
            }
        }

        const prefix = getSetting('prefix', process.env.PREFIX || '.');
        const ownerNoPrefix = process.env.OWNER_PREFIX === 'false';

        let isCommand = false;
        let args = [];
        let cmdName = '';

        if (m.body) {
            if (m.body.startsWith(prefix)) {
                isCommand = true;
                args = m.body.slice(prefix.length).trim().split(/ +/);
                cmdName = args.shift().toLowerCase();
            } else if (isOwner && ownerNoPrefix) {
                args = m.body.trim().split(/ +/);
                cmdName = args.shift().toLowerCase();
                if (commands.has(cmdName)) {
                    isCommand = true;
                }
            }
        }

        const divider = '━'.repeat(40);
        const logName = m.pushName || 'User';
        const logFitur = isCommand ? `${prefix}${cmdName}` : '-';
        
        let logMedia = '-';
        if (m.type === 'imageMessage') logMedia = 'Image';
        else if (m.type === 'videoMessage') logMedia = 'Video';
        else if (m.type === 'audioMessage') logMedia = 'Audio';
        else if (m.type === 'stickerMessage') logMedia = 'Sticker';
        else if (m.type === 'documentMessage') logMedia = 'Document';

        const logContext = m.isGroup ? 'Group' : 'Private';
        
        let logSize = '-';
        if (m.msg && m.msg.fileLength) {
            const bytes = Number(m.msg.fileLength);
            if (bytes > 1024 * 1024) logSize = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
            else if (bytes > 1024) logSize = `${(bytes / 1024).toFixed(2)} KB`;
            else logSize = `${bytes} B`;
        } else if (m.body) {
            logSize = `${m.body.length} Chars`;
        }

        console.log(`\n\x1b[36m${divider}\x1b[0m\n\x1b[33m👤 Name\x1b[0m   : ${logName}\n\x1b[32m🤖 Fitur\x1b[0m  : ${logFitur}\n\x1b[35m📂 Media\x1b[0m  : ${logMedia}\n\x1b[34m💬 Context\x1b[0m: ${logContext}\n\x1b[37m📦 Size\x1b[0m   : ${logSize}\n\x1b[36m${divider}\x1b[0m\n`);

        if (!m.body) return;

        const selfMode = getSetting('self_mode', 'false') === 'true';
        if (selfMode && !isOwner) return;

        if (m.body.startsWith('$')) {
            if (!isOwner) return;
            const cmdText = m.body.slice(1).trim();
            if (!cmdText) return;

            exec(cmdText, (error, stdout, stderr) => {
                let result = '';
                if (stdout) result += stdout;
                if (stderr) result += stderr;
                if (error) result += `\nError: ${error.message}`;
                m.reply(result.trim() || 'Success (no output)');
            });
            return;
        }

        if (isCommand) {
            const cmd = commands.get(cmdName);
            if (cmd) {
                if (cmd.forOwner && !isOwner) {
                    await m.reply('Perintah ini hanya dapat dijalankan oleh owner bot.');
                    return;
                }

                if (cmd.forAdminGrup) {
                    if (!m.isGroup) {
                        await m.reply('Perintah ini hanya dapat digunakan di dalam grup.');
                        return;
                    }

                    try {
                        let participants = getGroupParticipants(m.from);
                        
                        if (!participants || participants.length === 0) {
                            const groupMetadata = await sock.groupMetadata(m.from);
                            saveGroup(groupMetadata.id, groupMetadata.subject, groupMetadata.owner, groupMetadata.desc, groupMetadata.participants);
                            participants = groupMetadata.participants;
                        }

                        const senderJid = normalizeJid(m.sender);
                        
                        const senderParticipant = participants.find(p => {
                            const id = (p.id || p.jid) ? normalizeJid(p.id || p.jid) : '';
                            const phone = p.phoneNumber ? normalizeJid(p.phoneNumber) : '';
                            return id === senderJid || phone === senderJid;
                        });

                        const isSenderAdmin = senderParticipant && (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin');

                        if (!isSenderAdmin && !isOwner) {
                            await m.reply('Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
                            return;
                        }
                    } catch (err) {
                        console.error('Error saat memeriksa status admin grup:', err);
                        await m.reply('Gagal memverifikasi status admin Anda.');
                        return;
                    }
                }

                await cmd.execute(sock, m, args, commands);
            }
        }
    } catch (err) {
        console.error('Error saat menangani pesan:', err);
    }
}

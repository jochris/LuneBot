import { serialize } from './serialize.js';
import { getGroup, saveGroup, getSetting, getGroupParticipants } from '#lib/store';
import { isOwnerJid, normalizeJid } from '#helper/jid';
import { isPendingMessage } from '#helper/pendingMessage';
import { exec } from 'child_process';
import { checkAndResponseHama } from './hama.js';
import { isGroupBanned } from './bannedGroups.js';

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

        const prefix = getSetting('prefix', process.env.PREFIX || '.');
        const ownerNoPrefix = process.env.OWNER_PREFIX === 'false';

        let isCommand = false;
        let args = [];
        let cmdName = '';

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

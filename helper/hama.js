import fs from 'fs';
import path from 'path';
import { normalizeJid, resolvePhone } from './jid.js';

const HAMA_FILE = path.join('./cache', 'hama.json');
const cooldowns = new Map();

function ensureFile() {
    if (!fs.existsSync('./cache')) {
        fs.mkdirSync('./cache', { recursive: true });
    }
    if (!fs.existsSync(HAMA_FILE)) {
        fs.writeFileSync(HAMA_FILE, JSON.stringify({}), 'utf8');
    }
}

export function getHamas() {
    ensureFile();
    try {
        const data = fs.readFileSync(HAMA_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

export function addHama(jid, text) {
    const hamas = getHamas();
    const cleanJid = normalizeJid(jid);

    if (hamas[cleanJid] && hamas[cleanJid].startsWith('sticker:')) {
        const oldStickerPath = hamas[cleanJid].replace('sticker:', '');
        try {
            if (fs.existsSync(oldStickerPath)) {
                fs.unlinkSync(oldStickerPath);
            }
        } catch (err) {
            console.error('Error deleting old sticker:', err);
        }
    }

    hamas[cleanJid] = text;
    fs.writeFileSync(HAMA_FILE, JSON.stringify(hamas, null, 2), 'utf8');
}

export function delHama(jid) {
    const hamas = getHamas();
    const cleanJid = normalizeJid(jid);

    if (hamas[cleanJid] && hamas[cleanJid].startsWith('sticker:')) {
        const oldStickerPath = hamas[cleanJid].replace('sticker:', '');
        try {
            if (fs.existsSync(oldStickerPath)) {
                fs.unlinkSync(oldStickerPath);
            }
        } catch (err) {
            console.error('Error deleting sticker on delHama:', err);
        }
    }

    delete hamas[cleanJid];
    fs.writeFileSync(HAMA_FILE, JSON.stringify(hamas, null, 2), 'utf8');
}

export async function checkAndResponseHama(sock, m) {
    try {
        const hamas = getHamas();
        if (!m.sender) return;
        
        const senderJid = normalizeJid(m.sender);
        let matchedKey = null;

        if (hamas[senderJid]) {
            matchedKey = senderJid;
        } else {
            const phone = resolvePhone(senderJid);
            if (phone) {
                const pnJid = `${phone}@s.whatsapp.net`;
                if (hamas[pnJid]) {
                    matchedKey = pnJid;
                }
            }
        }

        if (!matchedKey) return;

        const responseText = hamas[matchedKey];
        const chatJid = m.from;
        const cooldownKey = `${senderJid}_${chatJid}`;
        const lastResponse = cooldowns.get(cooldownKey) || 0;
        const now = Date.now();

        if (now - lastResponse >= 180000) {
            cooldowns.set(cooldownKey, now);

            if (responseText.startsWith('sticker:')) {
                const stickerPath = responseText.replace('sticker:', '');
                if (fs.existsSync(stickerPath)) {
                    const stickerBuffer = fs.readFileSync(stickerPath);
                    await sock.sendMessage(chatJid, { sticker: stickerBuffer }, { quoted: m.raw });
                }
            } else {
                await sock.sendMessage(chatJid, {
                    text: responseText,
                    mentions: [m.sender]
                }, { quoted: m.raw });
            }
        }
    } catch (err) {
        console.error('Error in checkAndResponseHama:', err);
    }
}

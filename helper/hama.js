import fs from 'fs';
import path from 'path';
import { normalizeJid } from './jid.js';

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
    hamas[cleanJid] = text;
    fs.writeFileSync(HAMA_FILE, JSON.stringify(hamas, null, 2), 'utf8');
}

export function delHama(jid) {
    const hamas = getHamas();
    const cleanJid = normalizeJid(jid);
    delete hamas[cleanJid];
    fs.writeFileSync(HAMA_FILE, JSON.stringify(hamas, null, 2), 'utf8');
}

export async function checkAndResponseHama(sock, m) {
    try {
        const hamas = getHamas();
        if (!m.sender) return;
        
        const senderJid = normalizeJid(m.sender);
        if (!hamas[senderJid]) return;

        const responseText = hamas[senderJid];
        const chatJid = m.from;
        const cooldownKey = `${senderJid}_${chatJid}`;
        const lastResponse = cooldowns.get(cooldownKey) || 0;
        const now = Date.now();

        if (now - lastResponse >= 180000) {
            cooldowns.set(cooldownKey, now);
            await sock.sendMessage(chatJid, {
                text: responseText,
                mentions: [m.sender]
            }, { quoted: m.raw });
        }
    } catch (err) {
        console.error('Error in checkAndResponseHama:', err);
    }
}

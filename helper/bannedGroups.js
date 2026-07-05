import fs from 'fs';
import path from 'path';

const BAN_FILE = path.join('./cache', 'banned_groups.json');

function ensureFile() {
    if (!fs.existsSync('./cache')) {
        fs.mkdirSync('./cache', { recursive: true });
    }
    if (!fs.existsSync(BAN_FILE)) {
        fs.writeFileSync(BAN_FILE, JSON.stringify([]), 'utf8');
    }
}

export function getBannedGroups() {
    ensureFile();
    try {
        const data = fs.readFileSync(BAN_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export function banGroup(jid) {
    const list = getBannedGroups();
    if (!list.includes(jid)) {
        list.push(jid);
        fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
}

export function unbanGroup(jid) {
    const list = getBannedGroups();
    const index = list.indexOf(jid);
    if (index !== -1) {
        list.splice(index, 1);
        fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
}

export function isGroupBanned(jid) {
    const list = getBannedGroups();
    return list.includes(jid);
}

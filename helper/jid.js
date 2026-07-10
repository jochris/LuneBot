import { jidDecode } from '@itsliaaa/baileys';
import fs from 'fs';
import path from 'path';

/**
 * Decodes a WhatsApp JID and extracts its components (user, server, device).
 * 
 * @param {string} jid WhatsApp JID
 * @returns {object|null} Decoded JID structure
 */
export function decodeJid(jid) {
    if (!jid) return null;
    try {
        const decoded = jidDecode(jid);
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Normalizes a user JID to its canonical format (removes device IDs, agent IDs, etc.).
 * e.g., 628123456789:2@s.whatsapp.net -> 628123456789@s.whatsapp.net
 * 
 * @param {string} jid WhatsApp JID
 * @returns {string} Normalized JID
 */
export function normalizeJid(jid) {
    if (!jid) return '';
    try {
        const decoded = jidDecode(jid);
        if (!decoded) return jid;
        const { user, server } = decoded;
        return `${user}@${server}`;
    } catch {
        return jid;
    }
}

/**
 * Converts a raw phone number string to a standard WhatsApp JID format.
 * e.g., "+62 812-3456-789" -> "628123456789@s.whatsapp.net"
 * 
 * @param {string} number Raw phone number
 * @returns {string} Format-compliant JID
 */
export function toJid(number) {
    if (!number) return '';
    const cleanNumber = number.replace(/[^0-9]/g, '');
    return `${cleanNumber}@s.whatsapp.net`;
}

/**
 * Extracts the raw phone number (digits) from a JID.
 * e.g., "628123456789@s.whatsapp.net" -> "628123456789"
 * 
 * @param {string} jid WhatsApp JID
 * @returns {string} Raw digits
 */
export function getPhone(jid) {
    if (!jid) return '';
    const decoded = decodeJid(jid);
    return decoded ? decoded.user : '';
}

/**
 * Checks if the given JID is a group JID.
 * 
 * @param {string} jid WhatsApp JID
 * @returns {boolean} True if it is a group JID
 */
export function isGroup(jid) {
    return jid ? jid.endsWith('@g.us') : false;
}

/**
 * Checks if the given JID is a newsletter JID.
 * 
 * @param {string} jid WhatsApp JID
 * @returns {boolean} True if it is a newsletter JID
 */
export function isNewsletter(jid) {
    return jid ? jid.endsWith('@newsletter') : false;
}

/**
 * Checks if the given JID is an LID JID (Linked Identity).
 * 
 * @param {string} jid WhatsApp JID
 * @returns {boolean} True if it is an LID JID
 */
export function isLid(jid) {
    return jid ? jid.endsWith('@lid') : false;
}

/**
 * Checks if the given JID belongs to the bot owner.
 * Supports both PN and LID JIDs by checking session mapping files.
 * 
 * @param {string} jid WhatsApp JID
 * @returns {boolean} True if owner
 */
export function isOwnerJid(jid) {
    if (!jid) return false;
    const ownerNumber = process.env.OWNER_NUMBER;
    if (!ownerNumber) return false;

    const decoded = decodeJid(jid);
    if (!decoded) return false;

    const { user, server } = decoded;

    if (server === 's.whatsapp.net') {
        return user === ownerNumber;
    }

    if (server === 'lid') {
        try {
            const reversePath = path.join('./session', `lid-mapping-${user}_reverse.json`);
            if (fs.existsSync(reversePath)) {
                const content = fs.readFileSync(reversePath, 'utf8').trim();
                const mappedPhone = JSON.parse(content);
                return mappedPhone === ownerNumber;
            }
        } catch {
        }
        
        try {
            const forwardPath = path.join('./session', `lid-mapping-${ownerNumber}.json`);
            if (fs.existsSync(forwardPath)) {
                const content = fs.readFileSync(forwardPath, 'utf8').trim();
                const mappedLid = JSON.parse(content);
                return mappedLid === user;
            }
        } catch {
        }
    }

    return false;
}

export function resolvePhone(jid) {
    if (!jid) return '';
    const decoded = decodeJid(jid);
    if (!decoded) return '';
    const { user, server } = decoded;

    if (server === 's.whatsapp.net') {
        return user;
    }

    if (server === 'lid') {
        try {
            const reversePath = path.join('./session', `lid-mapping-${user}_reverse.json`);
            if (fs.existsSync(reversePath)) {
                const content = fs.readFileSync(reversePath, 'utf8').trim();
                return JSON.parse(content);
            }
        } catch {}
    }
    return user;
}

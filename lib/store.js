import { db } from './db.js';

/**
 * Saves or updates a contact in the database.
 * 
 * @param {string} id User JID
 * @param {string|null} name Contact name
 * @param {string|null} verifiedName Verified contact name
 */
export function saveContact(id, name, verifiedName) {
    db.run(
        `INSERT INTO contacts (id, name, verifiedName) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
            name = COALESCE(excluded.name, contacts.name), 
            verifiedName = COALESCE(excluded.verifiedName, contacts.verifiedName)`,
        [id, name || null, verifiedName || null]
    );
}

/**
 * Fetches contact info from the database.
 * 
 * @param {string} jid User JID
 * @returns {object|null} Contact row
 */
export function getContact(jid) {
    return db.query(`SELECT * FROM contacts WHERE id = ?`).get(jid);
}

/**
 * Saves or updates a group in the database, along with its participants.
 * 
 * @param {string} id Group JID
 * @param {string|null} subject Group subject/name
 * @param {string|null} owner Group owner JID
 * @param {string|null} desc Group description
 * @param {Array|null} participants Array of participant objects
 */
export const groupMetadataCache = new Map();

export const saveGroup = db.transaction((id, subject, owner, desc, participants = null) => {
    db.run(
        `INSERT INTO groups (id, subject, owner, desc) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
            subject = COALESCE(excluded.subject, groups.subject), 
            owner = COALESCE(excluded.owner, groups.owner), 
            desc = COALESCE(excluded.desc, groups.desc)`,
        [id, subject || null, owner || null, desc || null]
    );

    if (participants !== null) {
        db.run(`DELETE FROM group_participants WHERE groupId = ?`, [id]);

        const insertPart = db.prepare(`
            INSERT INTO group_participants (groupId, jid, admin) VALUES (?, ?, ?)
            ON CONFLICT(groupId, jid) DO UPDATE SET admin = excluded.admin
        `);

        for (const p of participants) {
            insertPart.run(id, p.id || p.jid, p.admin || p.isAdmin || null);
        }

        groupMetadataCache.set(id, {
            id,
            subject: subject || null,
            owner: owner || null,
            desc: desc || null,
            participants: participants.map(p => ({
                id: p.id || p.jid,
                admin: p.admin || p.isAdmin || null
            }))
        });
    } else {
        const cached = groupMetadataCache.get(id);
        if (cached) {
            cached.subject = subject || cached.subject;
            cached.owner = owner || cached.owner;
            cached.desc = desc || cached.desc;
        }
    }
});

export const updateGroupParticipants = db.transaction((groupId, participants, action) => {
    const cached = groupMetadataCache.get(groupId);

    if (action === 'add') {
        const insertPart = db.prepare(`
            INSERT INTO group_participants (groupId, jid, admin) VALUES (?, ?, ?)
            ON CONFLICT(groupId, jid) DO UPDATE SET admin = excluded.admin
        `);
        for (const jid of participants) {
            insertPart.run(groupId, jid, null);
        }

        if (cached) {
            for (const jid of participants) {
                if (!cached.participants.some(p => p.id === jid)) {
                    cached.participants.push({ id: jid, admin: null });
                }
            }
        }
    } else if (action === 'remove') {
        const deletePart = db.prepare(`
            DELETE FROM group_participants WHERE groupId = ? AND jid = ?
        `);
        for (const jid of participants) {
            deletePart.run(groupId, jid);
        }

        if (cached) {
            cached.participants = cached.participants.filter(p => !participants.includes(p.id));
        }
    } else if (action === 'promote') {
        const updatePart = db.prepare(`
            UPDATE group_participants SET admin = 'admin' WHERE groupId = ? AND jid = ?
        `);
        for (const jid of participants) {
            updatePart.run(groupId, jid);
        }

        if (cached) {
            for (const p of cached.participants) {
                if (participants.includes(p.id)) {
                    p.admin = 'admin';
                }
            }
        }
    } else if (action === 'demote') {
        const updatePart = db.prepare(`
            UPDATE group_participants SET admin = NULL WHERE groupId = ? AND jid = ?
        `);
        for (const jid of participants) {
            updatePart.run(groupId, jid);
        }

        if (cached) {
            for (const p of cached.participants) {
                if (participants.includes(p.id)) {
                    p.admin = null;
                }
            }
        }
    }
});

export async function fetchCachedGroupMetadata(jid) {
    if (groupMetadataCache.has(jid)) {
        return groupMetadataCache.get(jid);
    }

    const group = getGroup(jid);
    if (!group) return null;

    const participants = getGroupParticipants(jid);
    const metadata = {
        id: group.id,
        subject: group.subject,
        owner: group.owner,
        desc: group.desc,
        participants: participants.map(p => ({
            id: p.jid,
            admin: p.admin
        }))
    };

    groupMetadataCache.set(jid, metadata);
    return metadata;
}

/**
 * Fetches group details from the database.
 * 
 * @param {string} groupId Group JID
 * @returns {object|null} Group row
 */
export function getGroup(groupId) {
    return db.query(`SELECT * FROM groups WHERE id = ?`).get(groupId);
}

/**
 * Fetches participants of a group.
 * 
 * @param {string} groupId Group JID
 * @returns {Array} List of participants
 */
export function getGroupParticipants(groupId) {
    return db.query(`SELECT * FROM group_participants WHERE groupId = ?`).all(groupId);
}

/**
 * Binds SQLite store updates to the Baileys event emitter.
 * 
 * @param {import('@itsliaaa/baileys').WASocket} sock Baileys socket instance
 */
export function bindStore(sock) {
    sock.ev.on('contacts.upsert', (contacts) => {
        for (const contact of contacts) {
            saveContact(contact.id, contact.name || contact.verifiedName || null, contact.verifiedName || null);
        }
    });

    sock.ev.on('contacts.update', (updates) => {
        for (const update of updates) {
            const current = getContact(update.id);
            const name = update.name || update.verifiedName || (current ? current.name : null);
            const verifiedName = update.verifiedName || (current ? current.verifiedName : null);
            saveContact(update.id, name, verifiedName);
        }
    });

    sock.ev.on('groups.update', (updates) => {
        for (const update of updates) {
            const groupId = update.id;
            const current = getGroup(groupId);
            const subject = update.subject || (current ? current.subject : null);
            const owner = update.owner || (current ? current.owner : null);
            const desc = update.desc || (current ? current.desc : null);
            saveGroup(groupId, subject, owner, desc, null);
        }
    });

    sock.ev.on('group-metadata.update', (update) => {
        const groupId = update.id;
        const current = getGroup(groupId);
        const subject = update.subject || (current ? current.subject : null);
        const owner = update.owner || (current ? current.owner : null);
        const desc = update.desc || (current ? current.desc : null);
        saveGroup(groupId, subject, owner, desc, update.participants || []);
    });

    sock.ev.on('group-participants.update', (event) => {
        updateGroupParticipants(event.id, event.participants, event.action);
    });
}

/**
 * Retrieves a setting value by its key.
 * 
 * @param {string} key Configuration key
 * @param {string} defaultValue Fallback value if key not found
 * @returns {string} Configured value or default
 */
export function getSetting(key, defaultValue) {
    const row = db.query(`SELECT value FROM settings WHERE key = ?`).get(key);
    return row ? row.value : defaultValue;
}

/**
 * Saves or updates a setting in the database.
 * 
 * @param {string} key Configuration key
 * @param {string} value Value to store
 */
export function saveSetting(key, value) {
    db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
    );
}

/**
 * Creates or updates a sticker pack.
 * 
 * @param {string} name Pack name
 * @param {string} publisher Publisher
 * @param {string} description Description
 * @param {Buffer} cover Cover image buffer
 */
export function createStickerPack(name, publisher, description, cover) {
    db.run(
        `INSERT INTO sticker_packs (name, publisher, description, cover) VALUES (?, ?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET 
            publisher = COALESCE(excluded.publisher, sticker_packs.publisher),
            description = COALESCE(excluded.description, sticker_packs.description),
            cover = COALESCE(excluded.cover, sticker_packs.cover)`,
        [name, publisher || null, description || null, cover || null]
    );
}

/**
 * Adds a sticker to a pack.
 * 
 * @param {string} packName Pack name
 * @param {Buffer} data Sticker image buffer
 * @param {string} emojis Emojis JSON string
 */
export function addStickerToPack(packName, data, emojis) {
    db.run(
        `INSERT INTO sticker_pack_items (pack_name, data, emojis) VALUES (?, ?, ?)`,
        [packName, data, emojis || null]
    );
}

/**
 * Clears all stickers in a pack.
 * 
 * @param {string} packName Pack name
 */
export function clearStickerPackItems(packName) {
    db.run(`DELETE FROM sticker_pack_items WHERE pack_name = ?`, [packName]);
}

/**
 * Fetches a sticker pack.
 * 
 * @param {string} name Pack name
 * @returns {object|null} Pack details
 */
export function getStickerPack(name) {
    return db.query(`SELECT * FROM sticker_packs WHERE name = ?`).get(name);
}

/**
 * Fetches all stickers in a pack.
 * 
 * @param {string} packName Pack name
 * @returns {Array} List of stickers
 */
export function getStickerPackItems(packName) {
    return db.query(`SELECT * FROM sticker_pack_items WHERE pack_name = ?`).all(packName);
}

/**
 * Lists all sticker packs.
 * 
 * @returns {Array} List of packs with count
 */
export function listStickerPacks() {
    return db.query(`
        SELECT p.name, p.publisher, p.description, COUNT(i.id) as itemCount 
        FROM sticker_packs p 
        LEFT JOIN sticker_pack_items i ON p.name = i.pack_name 
        GROUP BY p.name
    `).all();
}

/**
 * Deletes a sticker pack.
 * 
 * @param {string} name Pack name
 */
export function deleteStickerPack(name) {
    db.run(`DELETE FROM sticker_packs WHERE name = ?`, [name]);
}

export default {
    db,
    saveContact,
    getContact,
    saveGroup,
    getGroup,
    getGroupParticipants,
    bindStore,
    getSetting,
    saveSetting,
    createStickerPack,
    addStickerToPack,
    clearStickerPackItems,
    getStickerPack,
    getStickerPackItems,
    listStickerPacks,
    deleteStickerPack,
    groupMetadataCache,
    updateGroupParticipants,
    fetchCachedGroupMetadata
};

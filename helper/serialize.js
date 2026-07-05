import { downloadContentFromMessage, getContentType } from '@itsliaaa/baileys';

/**
 * Serializes raw Baileys WhatsApp messages into a standardized format.
 * Includes helper methods for replying, reacting, deleting, and downloading media.
 * 
 * @param {import('@itsliaaa/baileys').WASocket} sock Baileys socket instance
 * @param {import('@itsliaaa/baileys').proto.IWebMessageInfo} msg Raw message object
 * @returns {object|null} Serialized message object
 */
export function serialize(sock, msg) {
    if (!msg) return null;

    const m = {};
    m.raw = msg;
    m.key = msg.key;
    m.id = msg.key.id;
    m.from = msg.key.remoteJid;
    m.isGroup = m.from.endsWith('@g.us');
    m.isNewsletter = m.from.endsWith('@newsletter');
    m.isStatus = m.from === 'status@broadcast';
    
    m.sender = m.isGroup ? msg.key.participant : m.from;

    m.isLid = m.sender ? m.sender.endsWith('@lid') : false;
    m.isPn = m.sender ? (m.sender.endsWith('@s.whatsapp.net') && !m.isLid) : false;
    
    m.pushName = msg.pushName || 'User';

    m.message = msg.message;
    if (m.message) {
        if (m.message.ephemeralMessage) {
            m.message = m.message.ephemeralMessage.message;
        }
        if (m.message.viewOnceMessage) {
            m.message = m.message.viewOnceMessage.message;
        }
        if (m.message.viewOnceMessageV2) {
            m.message = m.message.viewOnceMessageV2.message;
        }
        if (m.message.documentWithCaptionMessage) {
            m.message = m.message.documentWithCaptionMessage.message;
        }

        m.type = getContentType(m.message);
        m.msg = m.message[m.type];

        if (m.type === 'conversation') {
            m.body = m.message.conversation;
        } else if (m.type === 'extendedTextMessage') {
            m.body = m.message.extendedTextMessage.text;
        } else if (m.type === 'imageMessage') {
            m.body = m.message.imageMessage.caption;
        } else if (m.type === 'videoMessage') {
            m.body = m.message.videoMessage.caption;
        } else if (m.type === 'documentMessage') {
            m.body = m.message.documentMessage.caption || '';
        } else if (m.type === 'pollCreationMessage' || m.type === 'pollCreationMessageV3') {
            m.body = m.msg.name || '';
        } else if (m.type === 'buttonsResponseMessage') {
            m.body = m.message.buttonsResponseMessage.selectedButtonId;
        } else if (m.type === 'listResponseMessage') {
            m.body = m.message.listResponseMessage.singleSelectReply.selectedRowId;
        } else if (m.type === 'templateButtonReplyMessage') {
            m.body = m.message.templateButtonReplyMessage.selectedId;
        } else if (m.type === 'interactiveResponseMessage') {
            try {
                const parsed = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                m.body = parsed.id || '';
            } catch {
                m.body = '';
            }
        } else {
            m.body = '';
        }

        m.mentions = m.msg?.contextInfo?.mentionedJid || [];
        
        m.quoted = null;
        const contextInfo = m.msg?.contextInfo;
        if (contextInfo && contextInfo.quotedMessage) {
            const quotedParticipant = contextInfo.participant;
            const myJid = sock.user ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
            
            const quotedRaw = {
                key: {
                    remoteJid: m.from,
                    fromMe: quotedParticipant === myJid,
                    id: contextInfo.stanzaId,
                    participant: quotedParticipant
                },
                message: contextInfo.quotedMessage
            };
            m.quoted = serialize(sock, quotedRaw);
        }
    } else {
        m.type = null;
        m.msg = null;
        m.body = '';
        m.mentions = [];
        m.quoted = null;
    }

    m.reply = async (text, options = {}) => {
        return sock.sendMessage(m.from, { text, ...options }, { quoted: msg, ...options });
    };

    m.react = async (emoji) => {
        return sock.sendMessage(m.from, {
            react: {
                text: emoji,
                key: m.key
            }
        });
    };

    m.delete = async () => {
        return sock.sendMessage(m.from, { delete: m.key });
    };

    m.download = async () => {
        if (!m.type) return null;
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage', 'stickerPackMessage'];
        
        const isSelfMedia = mediaTypes.includes(m.type);
        const isQuotedMedia = m.quoted && mediaTypes.includes(m.quoted.type);

        if (!isSelfMedia && !isQuotedMedia) {
            throw new Error('Tidak ada media yang ditemukan pada pesan ini atau kutipannya.');
        }

        const targetMsg = isSelfMedia ? m.msg : m.quoted.msg;
        const targetType = isSelfMedia ? m.type : m.quoted.type;
        
        let streamType = targetType.replace('Message', '');
        if (streamType === 'stickerPack') {
            streamType = 'sticker-pack';
        }
        const stream = await downloadContentFromMessage(targetMsg, streamType);
        
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    return m;
}

export default serialize;

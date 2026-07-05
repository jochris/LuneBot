import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@itsliaaa/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import readline from 'readline';
import { bindStore, saveGroup } from './store.js';
import { handleGroupParticipantsUpdate } from '../helper/groupParticipantsHandler.js';
import { isOwnerJid, normalizeJid } from '../helper/jid.js';

const SESSION_DIR = './session';

if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

let groupSynced = false;

export async function connectToWhatsApp(onMessage) {
    console.log('Menginisialisasi koneksi WhatsApp...');

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan Baileys v${version.join('.')}, Terbaru: ${isLatest}`);

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const sock = makeWASocket.default ? makeWASocket.default({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
    }) : makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
    });

    bindStore(sock);

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        let phoneNumber = process.env.PAIRING_NUMBER;
        if (!phoneNumber) {
            phoneNumber = await question('Masukkan nomor telepon WhatsApp Anda (contoh: 628123456789): ');
        }
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        if (!phoneNumber) {
            console.error('Nomor telepon tidak valid!');
            process.exit(1);
        }

        setTimeout(async () => {
            try {
                console.log('Meminta pairing code dari WhatsApp...');
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n======================================`);
                console.log(`🔑 PAIRING CODE ANDA: \x1b[36m\x1b[1m${code}\x1b[0m`);
                console.log(`======================================\n`);
                console.log('Masukkan kode ini di WhatsApp -> Perangkat Tertaut -> Tautkan dengan nomor telepon saja.\n');
            } catch (err) {
                console.error('Gagal mendapatkan pairing code:', err);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log(`Koneksi terputus. Status code: ${reason}`);

            if (reason === DisconnectReason.loggedOut) {
                console.log('Sesi telah logout. Hapus folder ./session dan jalankan ulang.');
                process.exit(1);
            } else {
                console.log('Menyambungkan kembali dalam 3 detik...');
                setTimeout(() => {
                    connectToWhatsApp(onMessage).catch(err => {
                        console.error('Error saat reconnect:', err);
                    });
                }, 3000);
            }
        } else if (connection === 'open') {
            console.log('Berhasil terhubung ke WhatsApp!');

            if (!groupSynced) {
                groupSynced = true;
                console.log('Sinkronisasi metadata grup otomatis aktif via update events.');
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (msg.key.fromMe || !msg.message) continue;
            await onMessage(sock, msg);
        }
    });

    sock.ev.on('messages.reaction', async (reactions) => {
        try {
            if (!Array.isArray(reactions)) return;
            for (const r of reactions) {
                const { key, reaction } = r;
                if (!key || !reaction) continue;

                const sender = r.sender || reaction.key?.participant || (key.fromMe ? sock.user.id : null);
                if (!sender) continue;

                const normalizedSender = normalizeJid(sender);
                if (!isOwnerJid(normalizedSender)) continue;

                const emoji = reaction.text;
                if (emoji === '❌' || emoji === 'x' || emoji === 'X') {
                    await sock.sendMessage(key.remoteJid, { delete: key });
                }
            }
        } catch (err) {
            console.error('Error saat memproses reaksi pesan:', err);
        }
    });

    sock.ev.on('group-participants.update', async (anu) => {
        await handleGroupParticipantsUpdate(sock, anu);
    });

    return sock;
}

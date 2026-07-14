import './patch-baileys.js';
import config from './config.js';
global.config = config;

import { connectToWhatsApp } from './lib/connect.js';
import { handleMessage } from '#helper/messageHandler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawn } from 'child_process';

global.restartBot = () => {
    console.log('Memulai ulang bot...');
    const child = spawn(process.argv[0], process.argv.slice(1), {
        detached: true,
        stdio: 'inherit'
    });
    child.unref();
    process.exit(0);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
    const commands = new Map();
    const cmdDir = path.join(__dirname, 'cmd');

    if (!fs.existsSync(cmdDir)) {
        console.warn('Folder "cmd" tidak ditemukan. Membuat folder cmd...');
        fs.mkdirSync(cmdDir, { recursive: true });
        return commands;
    }

    const categories = fs.readdirSync(cmdDir);
    for (const category of categories) {
        const catPath = path.join(cmdDir, category);
        if (!fs.statSync(catPath).isDirectory()) continue;

        const files = fs.readdirSync(catPath).filter(file => file.endsWith('.js'));
        for (const file of files) {
            const filePath = path.join(catPath, file);
            try {
                const relPath = './' + path.relative(process.cwd(), filePath);
                const cmdModule = await import(relPath);
                const command = cmdModule.default;
                
                if (command && command.name) {
                    command.filePath = filePath;
                    commands.set(command.name, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            commands.set(alias, command);
                        }
                    }
                    console.log(`Loaded command: .${command.name} (${category})`);
                }
            } catch (err) {
                console.error(`Gagal memuat command ${file}:`, err);
            }
        }
    }
    return commands;
}

function startWatcher(commands) {
    const cmdDir = path.join(__dirname, 'cmd');
    const debounces = new Map();

    fs.watch(cmdDir, { recursive: true }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.js')) return;

        const filePath = path.join(cmdDir, filename);

        if (debounces.has(filePath)) {
            clearTimeout(debounces.get(filePath));
        }

        const timeout = setTimeout(async () => {
            debounces.delete(filePath);
            console.log(`Menyegarkan file command: ${filename} (${eventType})`);
            await reloadCommand(filePath, commands);
        }, 300);

        debounces.set(filePath, timeout);
    });
}

async function reloadCommand(filePath, commands) {
    for (const [key, cmd] of commands.entries()) {
        if (cmd.filePath === filePath) {
            commands.delete(key);
        }
    }

    if (!fs.existsSync(filePath)) {
        console.log(`Command file dihapus: ${path.basename(filePath)}`);
        return;
    }

    try {
        const relPath = './' + path.relative(process.cwd(), filePath) + '?t=' + Date.now() + '_' + Math.random();
        const cmdModule = await import(relPath);
        const command = cmdModule.default;

        if (command && command.name) {
            command.filePath = filePath;
            commands.set(command.name, command);
            if (command.aliases && Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                    commands.set(alias, command);
                }
            }
            console.log(`Berhasil memuat ulang command: .${command.name}`);
        }
    } catch (err) {
        console.error(`Gagal memuat ulang command di ${filePath}:`, err);
    }
}

async function main() {
    const commands = await loadCommands();
    const uniqueCount = new Set(commands.values()).size;
    console.log(`Total command yang dimuat: ${uniqueCount}`);

    startWatcher(commands);

    await connectToWhatsApp(async (sock, rawMsg) => {
        await handleMessage(sock, rawMsg, commands);
    });
}

main().catch(err => {
    console.error('Fatal error di main handler:', err);
});

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default {
    name: 'update',
    aliases: ['gitupdate', 'up'],
    description: 'Melakukan pembaruan (git pull) dari GitHub dan restart bot.',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        await m.reply('Memulai proses pembaruan dari GitHub...');

        try {
            const { stdout, stderr } = await execAsync('git pull');
            
            if (stdout.includes('Already up to date.') || stdout.includes('Already up-to-date.')) {
                await m.reply('Script sudah menggunakan versi terbaru dari GitHub.');
                return;
            }

            let replyMsg = `*Hasil Git Pull:*\n\`\`\`${stdout || stderr}\`\`\`\n\n`;

            const isPackageChanged = stdout.includes('package.json') || stdout.includes('bun.lock');
            
            if (isPackageChanged) {
                replyMsg += 'Mendeteksi perubahan dependensi. Menjalankan "bun install"...\n';
                await m.reply(replyMsg);
                
                const { stdout: installOut, stderr: installErr } = await execAsync('bun install');
                replyMsg += `*Hasil Bun Install:*\n\`\`\`${installOut || installErr}\`\`\`\n\n`;
            }

            replyMsg += 'Pembaruan selesai. Menjalankan restart bot...';
            await m.reply(replyMsg);

            setTimeout(() => {
                global.restartBot();
            }, 2000);
        } catch (err) {
            console.error('Error saat melakukan auto-update:', err);
            await m.reply(`✗ Terjadi kesalahan saat pembaruan:\n${err.message}`);
        }
    }
};

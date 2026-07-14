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
        const sent = await m.reply('⏳ Memulai proses pembaruan dari GitHub...');
        const key = sent.key;

        const editMsg = async (text) => {
            await sock.sendMessage(m.from, { text, edit: key });
        };

        try {
            const { stdout, stderr } = await execAsync('git pull');
            
            if (stdout.includes('Already up to date.') || stdout.includes('Already up-to-date.')) {
                await editMsg('✅ Script sudah menggunakan versi terbaru dari GitHub.');
                return;
            }

            let replyMsg = `*Hasil Git Pull:*\n\`\`\`${stdout || stderr}\`\`\`\n\n`;
            await editMsg(replyMsg);

            const isPackageChanged = stdout.includes('package.json') || stdout.includes('bun.lock');
            
            if (isPackageChanged) {
                replyMsg += '📦 Mendeteksi perubahan dependensi. Menjalankan "bun install"...\n';
                await editMsg(replyMsg);
                
                const { stdout: installOut, stderr: installErr } = await execAsync('bun install');
                replyMsg += `*Hasil Bun Install:*\n\`\`\`${installOut || installErr}\`\`\`\n\n`;
                await editMsg(replyMsg);
            }

            replyMsg += '🔄 Pembaruan selesai. Menjalankan restart bot...';
            await editMsg(replyMsg);

            setTimeout(() => {
                global.restartBot();
            }, 2000);
        } catch (err) {
            console.error('Error saat melakukan auto-update:', err);
            await editMsg(`✗ Terjadi kesalahan saat pembaruan:\n${err.message}`);
        }
    }
};

export default {
    name: 'removebg',
    aliases: ['nobg', 'rbg'],
    description: 'Menghapus latar belakang (background) dari gambar menggunakan AI.',
    category: 'maker',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage' || (m.quoted && m.quoted.type === 'imageMessage');

        if (!isImage) {
            await m.reply('Kirim gambar atau reply gambar dengan caption *.removebg* untuk menghapus latar belakang gambar.');
            return;
        }

        try {
            await m.react('⏳');

            const mediaBuffer = await m.download();
            const mimeType = m.type === 'imageMessage' ? m.mime : m.quoted.mime;

            const formData = new FormData();
            const blob = new Blob([mediaBuffer], { type: mimeType });
            formData.append('file', blob, 'image.jpg');

            const apiUrl = 'https://myapi.astralune.cv/api/v1/tools/removebg';
            const res = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                let errMsg = `HTTP ${res.status}`;
                try {
                    const errJson = await res.json();
                    errMsg = errJson.message || errMsg;
                } catch {
                    try {
                        const txt = await res.text();
                        errMsg = txt.slice(0, 150) || errMsg;
                    } catch {}
                }
                throw new Error(errMsg);
            }

            const outBuffer = Buffer.from(await res.arrayBuffer());

            await sock.sendMessage(m.from, { 
                image: outBuffer, 
                caption: '✨ *Latar belakang berhasil dihapus!*' 
            }, { quoted: m.raw });

            await m.react('✅');
        } catch (err) {
            console.error('Error saat removebg:', err);
            await m.react('❌');
            await m.reply(`Gagal menghapus latar belakang: ${err.message}`);
        }
    }
};

import { 
    createStickerPack, 
    addStickerToPack, 
    clearStickerPackItems, 
    getStickerPack, 
    getStickerPackItems, 
    listStickerPacks, 
    deleteStickerPack 
} from '#lib/store';
import { unzipSync } from 'fflate';

export default {
    name: 'pack',
    aliases: ['stickerpack'],
    description: 'Mengelola dan mengirimkan paket stiker (Sticker Pack).',
    category: 'owner',
    forOwner: true,
    async execute(sock, m, args) {
        const sub = args[0]?.toLowerCase();
        
        if (!sub || sub === 'help') {
            let helpMsg = `*PENGGUNAAN PERINTAH STICKER PACK*\n\n`;
            helpMsg += `- *.pack create <nama>* : Membuat paket stiker baru (Balas stiker/gambar sebagai sampul)\n`;
            helpMsg += `- *.pack add <nama>* : Menambahkan stiker ke paket (Balas stiker/gambar)\n`;
            helpMsg += `- *.pack list* : Menampilkan daftar paket stiker di database\n`;
            helpMsg += `- *.pack send <nama>* : Mengirimkan paket stiker ke obrolan ini\n`;
            helpMsg += `- *.pack save <nama>* : Menyimpan paket stiker dari pesan terbalas (Balas pesan Sticker Pack)\n`;
            helpMsg += `- *.pack delete <nama>* : Menghapus paket stiker dari database\n`;
            await m.reply(helpMsg.trim());
            return;
        }

        const packName = args[1]?.trim();

        if (sub === 'create') {
            if (!packName) {
                await m.reply('Silakan masukkan nama paket stiker. Contoh: .pack create anime');
                return;
            }

            const quoted = m.quoted;
            if (!quoted || (quoted.type !== 'imageMessage' && quoted.type !== 'stickerMessage')) {
                await m.reply('Silakan balas (reply) stiker atau gambar yang ingin dijadikan sampul (cover) untuk paket stiker ini.');
                return;
            }

            try {
                const coverBuffer = await quoted.download();
                if (!coverBuffer) {
                    await m.reply('Gagal mengunduh sampul.');
                    return;
                }

                createStickerPack(
                    packName, 
                    process.env.BOT_NAME || 'LuneBot', 
                    'Koleksi Lune WhatsApp Bot', 
                    coverBuffer
                );

                await m.reply(`Paket stiker *${packName}* berhasil dibuat. Sekarang Anda dapat menambahkan stiker dengan perintah: .pack add ${packName}`);
            } catch (err) {
                console.error(err);
                await m.reply('Terjadi kesalahan saat membuat paket stiker.');
            }
            return;
        }

        if (sub === 'add') {
            if (!packName) {
                await m.reply('Silakan masukkan nama paket stiker tujuan. Contoh: .pack add anime');
                return;
            }

            const pack = getStickerPack(packName);
            if (!pack) {
                await m.reply(`Paket stiker *${packName}* belum dibuat. Silakan buat terlebih dahulu dengan: .pack create ${packName}`);
                return;
            }

            const quoted = m.quoted;
            if (!quoted || (quoted.type !== 'imageMessage' && quoted.type !== 'stickerMessage')) {
                await m.reply('Silakan balas (reply) stiker atau gambar yang ingin ditambahkan ke paket.');
                return;
            }

            try {
                const stickerBuffer = await quoted.download();
                if (!stickerBuffer) {
                    await m.reply('Gagal mengunduh stiker.');
                    return;
                }

                const currentItems = getStickerPackItems(packName);
                if (currentItems.length >= 60) {
                    await m.reply('Gagal menambahkan. Batas maksimal stiker dalam satu paket adalah 60 stiker.');
                    return;
                }

                addStickerToPack(packName, stickerBuffer, JSON.stringify(['✨']));
                await m.reply(`Berhasil menambahkan stiker ke paket *${packName}*. (Total: ${currentItems.length + 1}/60)`);
            } catch (err) {
                console.error(err);
                await m.reply('Terjadi kesalahan saat menambahkan stiker ke paket.');
            }
            return;
        }

        if (sub === 'list') {
            const list = listStickerPacks();
            if (list.length === 0) {
                await m.reply('Belum ada paket stiker yang tersimpan di database.');
                return;
            }

            let response = `*DAFTAR STICKER PACK*\n\n`;
            list.forEach((p, index) => {
                response += `${index + 1}. *${p.name}* (${p.itemCount} stiker)\n`;
                response += `   Publisher: ${p.publisher || 'LuneBot'}\n\n`;
            });
            await m.reply(response.trim());
            return;
        }

        if (sub === 'send') {
            if (!packName) {
                await m.reply('Silakan masukkan nama paket stiker yang ingin dikirim. Contoh: .pack send anime');
                return;
            }

            const pack = getStickerPack(packName);
            if (!pack) {
                await m.reply(`Paket stiker *${packName}* tidak ditemukan.`);
                return;
            }

            const items = getStickerPackItems(packName);
            if (items.length === 0) {
                await m.reply(`Paket stiker *${packName}* masih kosong. Silakan tambahkan stiker terlebih dahulu.`);
                return;
            }

            try {
                const stickers = items.map(item => ({
                    data: Buffer.from(item.data),
                    emojis: JSON.parse(item.emojis || '["✨"]')
                }));

                await sock.sendMessage(m.from, {
                    stickers: stickers,
                    cover: Buffer.from(pack.cover),
                    name: pack.name,
                    publisher: pack.publisher || 'LuneBot',
                    description: pack.description || 'Lune Sticker Pack'
                });
            } catch (err) {
                console.error(err);
                await m.reply('Terjadi kesalahan saat mengirimkan paket stiker.');
            }
            return;
        }

        if (sub === 'save') {
            if (!packName) {
                await m.reply('Silakan masukkan nama paket baru untuk menyimpan. Contoh: .pack save anime_baru');
                return;
            }

            const quoted = m.quoted;
            if (!quoted || quoted.type !== 'stickerPackMessage') {
                await m.reply('Silakan balas (reply) ke pesan Sticker Pack untuk menyimpannya.');
                return;
            }

            try {
                const zipBuffer = await quoted.download();
                if (!zipBuffer) {
                    await m.reply('Gagal mengunduh berkas paket stiker.');
                    return;
                }

                const unzipped = unzipSync(zipBuffer);
                const packMsg = quoted.msg;
                
                const coverFileName = packMsg.trayIconFileName || `${packMsg.stickerPackId}.webp`;
                const coverBuffer = unzipped[coverFileName];

                if (!coverBuffer) {
                    await m.reply('Sampul (cover) stiker paket tidak ditemukan di dalam berkas.');
                    return;
                }

                createStickerPack(
                    packName, 
                    packMsg.publisher || 'LuneBot', 
                    packMsg.packDescription || 'Koleksi Lune WhatsApp Bot', 
                    Buffer.from(coverBuffer)
                );

                clearStickerPackItems(packName);

                const stickersMeta = packMsg.stickers || [];
                let savedCount = 0;

                for (const item of stickersMeta) {
                    const fileData = unzipped[item.fileName];
                    if (fileData) {
                        addStickerToPack(
                            packName, 
                            Buffer.from(fileData), 
                            JSON.stringify(item.emojis || ['✨'])
                        );
                        savedCount++;
                    }
                }

                await m.reply(`Berhasil mengimpor dan menyimpan paket stiker *${packName}* ke database. (Total: ${savedCount} stiker)`);
            } catch (err) {
                console.error(err);
                await m.reply('Terjadi kesalahan saat menyimpan paket stiker.');
            }
            return;
        }

        if (sub === 'delete') {
            if (!packName) {
                await m.reply('Silakan masukkan nama paket stiker yang ingin dihapus. Contoh: .pack delete anime');
                return;
            }

            const pack = getStickerPack(packName);
            if (!pack) {
                await m.reply(`Paket stiker *${packName}* tidak ditemukan.`);
                return;
            }

            try {
                deleteStickerPack(packName);
                await m.reply(`Paket stiker *${packName}* beserta seluruh stikernya berhasil dihapus dari database.`);
            } catch (err) {
                console.error(err);
                await m.reply('Terjadi kesalahan saat menghapus paket stiker.');
            }
            return;
        }

        await m.reply('Sub-perintah tidak dikenal. Silakan gunakan *.pack help* untuk melihat cara penggunaan.');
    }
};

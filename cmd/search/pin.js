const PINTEREST_API = 'https://myapi.astralune.cv/api/v1/search/pinterest';

async function searchPinterest(query) {
    const url = PINTEREST_API + '?q=' + encodeURIComponent(query);
    const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error('Pinterest API error: ' + res.status);
    const data = await res.json();
    if (!data.status) throw new Error('Pinterest API returned error');
    return data.result || [];
}

export default {
    name: 'pin',
    aliases: ['pinterest'],
    description: 'Mencari gambar di Pinterest.',
    category: 'search',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan kata kunci pencarian. Contoh:\n*.pin kucing* (default 5 gambar)\n*.pin kucing 8* (mengambil 8 gambar, maks 10)');
            return;
        }

        let count = 5;
        let query = args.join(' ');

        if (args.length > 1) {
            const lastArg = args[args.length - 1];
            const parsedCount = parseInt(lastArg);
            if (!isNaN(parsedCount) && parsedCount > 0) {
                count = parsedCount;
                query = args.slice(0, -1).join(' ');
            }
        }

        count = Math.max(1, Math.min(10, count));

        try {
            const results = await searchPinterest(query);
            const validResults = results.filter(item => item.image);

            if (validResults.length === 0) {
                await m.reply('Tidak ditemukan hasil untuk "' + query + '".');
                return;
            }

            const selected = validResults.slice(0, count);

            const cards = selected.map((item, i) => ({
                image: { url: item.image },
                title: item.title || 'Pin #' + (i + 1),
                caption: (item.pinner ? '📌 ' + item.pinner : '') +
                         (item.likes ? ' • ❤️ ' + item.likes : ''),
                footer: item.domain || 'Pinterest',
                nativeFlow: [
                    {
                        type: 'url',
                        text: 'Lihat di Pinterest',
                        url: 'https://pinterest.com/pin/' + item.id
                    }
                ]
            }));

            await sock.sendMessage(m.from, {
                text: '🔍 Hasil Pinterest: ' + query,
                footer: '© Lune Bot • ' + selected.length + ' gambar',
                cards: cards
            }, { quoted: m.raw });
        } catch (err) {
            console.error('Error Pinterest:', err);
            await m.reply('Gagal mencari di Pinterest: ' + err.message);
        }
    }
};

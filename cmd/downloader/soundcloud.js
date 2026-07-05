const BASE_HEADERS = {
    "accept-encoding": "gzip, deflate, br, zstd",
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
};

function toMobileUrl(trackUrl) {
    const url = new URL(trackUrl);
    if (!url.host.startsWith("m.")) url.host = "m." + url.host;
    return url.toString();
}

async function getTrackMetadata(mobileUrl) {
    const r = await fetch(mobileUrl, { headers: BASE_HEADERS });
    if (!r.ok) throw new Error(`metadata HTTP ${r.status}`);
    const html = await r.text();
    const match = html.match(
        /__NEXT_DATA__" type="application\/json">(.+?)<\/script>/
    )?.[1];
    if (!match) throw new Error("Gagal ambil metadata track");
    return JSON.parse(match);
}

async function getProgressive(tmObj) {
    const entries = Object.entries(
        tmObj?.props?.pageProps?.initialStoreState?.entities?.tracks || {}
    );
    if (!entries.length) throw new Error("Track data kosong");
    const ctm = entries[0][1].data;

    const purl = ctm?.media?.transcodings?.find(
        (a) => a?.format?.protocol === "progressive"
    )?.url;
    if (!purl) throw new Error("Progressive URL tidak ditemukan");

    const track_authorization = ctm.track_authorization;
    const client_id = tmObj?.runtimeConfig?.clientId;
    if (!client_id) throw new Error("clientId tidak ditemukan");

    const url = new URL(purl);
    url.search = new URLSearchParams({
        client_id,
        track_authorization,
        stage: "",
    }).toString();

    const r = await fetch(url, { headers: BASE_HEADERS });
    if (!r.ok) throw new Error(`progressive HTTP ${r.status}`);
    const json = await r.json();
    if (!json?.url) throw new Error("Audio URL kosong");

    const head = Array.isArray(tmObj?.head) ? tmObj.head : [];
    const user = head.find(
        (p) => p?.[1]?.name === "twitter:audio:artist_name"
    )?.[1]?.content;
    const imageUrl = (ctm.artwork_url || "").replace("large", "t1080x1080");

    return {
        title: ctm.title,
        user: user || null,
        like: ctm.likes_count ?? null,
        comment: ctm.comment_count ?? null,
        duration_ms: ctm.duration ?? null,
        permalink: ctm.permalink_url || null,
        imageUrl: imageUrl || null,
        audioUrl: json.url,
    };
}

async function downloadTrack(trackUrl) {
    const murl = toMobileUrl(trackUrl);
    const tmObj = await getTrackMetadata(murl);
    return await getProgressive(tmObj);
}

export default {
    name: 'soundcloud',
    aliases: ['sc', 'scdl'],
    description: 'Download audio dari SoundCloud.',
    category: 'downloader',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL SoundCloud. Contoh: .soundcloud https://soundcloud.com/nocopyrightsounds/sub-urban-cradles-ncs-release');
            return;
        }

        const url = args[0];
        try {
            const data = await downloadTrack(url);
            await sock.sendMessage(m.from, {
                audio: { url: data.audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${data.title}.mp3`
            }, { quoted: m.raw });
        } catch (err) {
            console.error('Error SoundCloud DL:', err);
            await m.reply(`Gagal mendownload SoundCloud: ${err.message}`);
        }
    }
};

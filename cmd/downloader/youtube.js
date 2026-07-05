import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { proto, generateWAMessageFromContent } from '@itsliaaa/baileys';

const YT_URL_RE = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/.+$/i;
const CACHE_DIR = './cache/youtube';

const SEARCH_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-YouTube-Client-Name": "1",
    "X-YouTube-Client-Version": "2.20240101.00.00",
};

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function formatDuration(sec) {
    if (!sec) return '?';
    if (typeof sec === 'string') return sec;
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function extractVideoId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?/]{11})/i);
    return match ? match[1] : null;
}

async function searchYoutube(query) {
    const res = await axios.post(
        "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
        {
            query,
            context: {
                client: {
                    clientName: "WEB",
                    clientVersion: "2.20240101.00.00",
                    hl: "en",
                    gl: "US",
                },
            },
        },
        { headers: SEARCH_HEADERS, timeout: 30000 }
    );
    const sections =
        res.data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents ?? [];
    for (const section of sections) {
        for (const item of section?.itemSectionRenderer?.contents ?? []) {
            const v = item?.videoRenderer;
            if (!v?.videoId) continue;
            return {
                title: v.title?.runs?.[0]?.text ?? "Unknown",
                channel: v.ownerText?.runs?.[0]?.text ?? "Unknown",
                duration: v.lengthText?.simpleText ?? "?",
                views: v.viewCountText?.simpleText ?? "?",
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                videoId: v.videoId,
            };
        }
    }
    throw new Error("Video tidak ditemukan");
}

export default {
    name: 'youtube',
    aliases: ['yt', 'ytdl', 'play', 'ytmp3', 'yta', 'ytmp4', 'ytv'],
    description: 'Cari dan download video/audio dari YouTube.',
    category: 'downloader',
    async execute(sock, m, args) {
        const cmdName = m.body.slice(1).split(' ')[0].toLowerCase();
        const forceAudio = ['ytmp3', 'yta'].includes(cmdName);
        const forceVideo = ['ytmp4', 'ytv'].includes(cmdName);

        if (args.length === 0) {
            await m.reply('Masukkan kata kunci pencarian atau URL YouTube. Contoh: .play Would\'ve been you');
            return;
        }

        const input = args.join(' ');
        const isUrl = YT_URL_RE.test(input.trim());

        try {
            if (forceAudio) {
                await m.react('⏳');
                
                let targetUrl = input.trim();
                let videoId = extractVideoId(targetUrl);
                
                if (!videoId && !isUrl) {
                    const searchRes = await fetch(`https://api.azbry.com/api/download/ytplay?q=${encodeURIComponent(input.trim())}`);
                    if (!searchRes.ok) {
                        throw new Error(`Search API HTTP ${searchRes.status}`);
                    }
                    const searchJson = await searchRes.json();
                    if (!searchJson.status || !searchJson.result) {
                        throw new Error(searchJson.message || 'Media tidak ditemukan');
                    }
                    videoId = searchJson.result.videoId;
                    targetUrl = searchJson.result.url;
                } else if (isUrl && !videoId) {
                    videoId = 'unknown_' + Date.now();
                }

                const cachePath = path.resolve(path.join(CACHE_DIR, `${videoId}.mp3`));
                let title = 'YouTube Audio';

                if (fs.existsSync(cachePath)) {
                    const namePath = cachePath + '.name';
                    if (fs.existsSync(namePath)) {
                        title = fs.readFileSync(namePath, 'utf8');
                    }
                } else {
                    const apiRes = await fetch(`https://api.azbry.com/api/download/ytplay?q=${encodeURIComponent(targetUrl)}`);
                    if (!apiRes.ok) {
                        throw new Error(`API HTTP ${apiRes.status}`);
                    }
                    const json = await apiRes.json();
                    if (!json.status || !json.result) {
                        throw new Error(json.message || 'Media tidak ditemukan');
                    }

                    const result = json.result;
                    title = result.title || 'YouTube Audio';
                    
                    const dlRes = await fetch(result.download);
                    if (!dlRes.ok) {
                        throw new Error(`Gagal mendownload file dari CDN (HTTP ${dlRes.status})`);
                    }
                    const buffer = Buffer.from(await dlRes.arrayBuffer());
                    
                    fs.writeFileSync(cachePath, buffer);
                    fs.writeFileSync(cachePath + '.name', title, 'utf8');
                }

                await sock.sendMessage(m.from, {
                    audio: { url: cachePath },
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`
                }, { quoted: m.raw });
                await m.react('✅');
            } else if (forceVideo) {
                await m.react('⏳');
                let targetUrl = input.trim();
                let searchMeta = null;

                if (!isUrl) {
                    searchMeta = await searchYoutube(input);
                    targetUrl = searchMeta.url;
                }

                let videoId = extractVideoId(targetUrl);
                if (!videoId) {
                    videoId = 'unknown_' + Date.now();
                }

                const cachePath = path.resolve(path.join(CACHE_DIR, `${videoId}_480p.mp4`));
                let title = 'YouTube Video';
                let author = 'Unknown';
                let duration = '?';
                let quality = '480p';

                if (fs.existsSync(cachePath)) {
                    const metaPath = cachePath + '.meta';
                    if (fs.existsSync(metaPath)) {
                        try {
                            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                            title = meta.title;
                            author = meta.author;
                            duration = meta.duration;
                            quality = meta.quality;
                        } catch (e) {}
                    }
                } else {
                    const apiRes = await fetch(`https://api.azbry.com/api/download/ytmp4?url=${encodeURIComponent(targetUrl)}`);
                    if (!apiRes.ok) {
                        throw new Error(`Video API HTTP ${apiRes.status}`);
                    }
                    const json = await apiRes.json();
                    if (!json.status || !json.result) {
                        throw new Error(json.message || 'Gagal mengambil link video');
                    }

                    const result = json.result;
                    title = result.title || (searchMeta ? searchMeta.title : 'YouTube Video');
                    author = result.author || (searchMeta ? searchMeta.channel : 'Unknown');
                    duration = formatDuration(result.duration || (searchMeta ? searchMeta.duration : '?'));
                    quality = result.quality || '480p';

                    const dlRes = await fetch(result.download);
                    if (!dlRes.ok) {
                        throw new Error(`Gagal mendownload file dari CDN (HTTP ${dlRes.status})`);
                    }
                    const buffer = Buffer.from(await dlRes.arrayBuffer());

                    fs.writeFileSync(cachePath, buffer);
                    fs.writeFileSync(cachePath + '.meta', JSON.stringify({ title, author, duration, quality }), 'utf8');
                }

                let captionText = `🎥 *YOUTUBE VIDEO*\n\n`;
                captionText += `📝 *Judul*: ${title}\n`;
                if (author && author !== 'Unknown') {
                    captionText += `👤 *Saluran*: ${author}\n`;
                }
                captionText += `⏱️ *Durasi*: ${duration}\n`;
                captionText += `🏷️ *Kualitas*: ${quality}\n`;
                captionText = captionText.trim();

                await sock.sendMessage(m.from, {
                    video: { url: cachePath },
                    caption: captionText
                }, { quoted: m.raw });
                await m.react('✅');
            } else {
                let title = 'YouTube Media';
                let duration = '?';
                let url = '';

                if (isUrl) {
                    const apiRes = await fetch(`https://api.azbry.com/api/download/ytplay?q=${encodeURIComponent(input.trim())}`);
                    if (!apiRes.ok) {
                        throw new Error(`API HTTP ${apiRes.status}`);
                    }
                    const json = await apiRes.json();
                    if (!json.status || !json.result) {
                        throw new Error(json.message || 'Media tidak ditemukan');
                    }
                    const result = json.result;
                    title = result.title || 'YouTube Media';
                    duration = formatDuration(result.duration);
                    url = result.url;
                } else {
                    const searchMeta = await searchYoutube(input);
                    title = searchMeta.title;
                    duration = searchMeta.duration;
                    url = searchMeta.url;
                }

                let bodyText = `🎥 *YOUTUBE DOWNLOADER*\n\n`;
                bodyText += `📝 *Judul*: ${title}\n`;
                bodyText += `⏱️ *Durasi*: ${duration}\n\n`;
                bodyText += `Silakan ketuk tombol di bawah untuk memilih format unduhan.`;

                const msg = generateWAMessageFromContent(m.from, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
                                footer: proto.Message.InteractiveMessage.Footer.create({ text: "Lune Bot Downloader" }),
                                header: proto.Message.InteractiveMessage.Header.create({ title: "Pilihan Format Unduhan", hasMediaAttachment: false }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                    buttons: [
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "🎵 Audio (MP3)",
                                                id: `.ytmp3 ${url}`
                                            })
                                        },
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "🎥 Video (MP4)",
                                                id: `.ytmp4 ${url}`
                                            })
                                        }
                                    ]
                                })
                            })
                        }
                    }
                }, { quoted: m.raw });

                await sock.relayMessage(m.from, msg.message, { messageId: msg.key.id });
            }
        } catch (err) {
            console.error('Error YouTube DL:', err);
            await m.react('❌');
            await m.reply(`Gagal mendownload YouTube: ${err.message}`);
        }
    }
};

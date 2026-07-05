import axios from 'axios';
import FormData from 'form-data';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import vm from 'node:vm';
import crypto from 'node:crypto';

const BASE = "https://snaptik.app";
const PAGE = `${BASE}/en2`;
const API = `${BASE}/abc2.php`;
const LANG = "en2";

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function autoToken() {
    const unix = Math.floor(Date.now() / 1000).toString();
    return `ey${Buffer.from(unix).toString("base64")}c`;
}

function commonHeaders(extra = {}) {
    return {
        "user-agent": UA,
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "x-request-id": crypto.randomUUID(),
        ...extra,
    };
}

function extractToken(html) {
    const $ = cheerio.load(html);
    return $('input[name="token"]').attr("value") || null;
}

async function saveCookies(jar, res) {
    const cookies = res.headers["set-cookie"] || [];
    for (const cookie of cookies) {
        await jar.setCookie(cookie, BASE);
    }
}

async function openHome(jar) {
    const res = await axios.get(PAGE, {
        timeout: 30000,
        validateStatus: () => true,
        headers: commonHeaders({
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "upgrade-insecure-requests": "1",
            "sec-fetch-site": "none",
            "sec-fetch-mode": "navigate",
            "sec-fetch-user": "?1",
            "sec-fetch-dest": "document",
        }),
    });
    await saveCookies(jar, res);
    const html = String(res.data || "");
    const token = extractToken(html) || autoToken();
    return { status: res.status, token, html };
}

async function submitVideo(jar, url, token) {
    const form = new FormData();
    form.append("url", url);
    form.append("lang", LANG);
    form.append("token", token);

    const cookie = await jar.getCookieString(BASE);

    const res = await axios.post(API, form, {
        timeout: 60000,
        validateStatus: () => true,
        headers: {
            ...commonHeaders({
                accept: "*/*",
                origin: BASE,
                referer: PAGE,
                "sec-fetch-site": "same-origin",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                priority: "u=1, i",
                cookie,
            }),
            ...form.getHeaders(),
        },
    });
    await saveCookies(jar, res);
    return { status: res.status, body: String(res.data || "") };
}

function decodeObfuscatedResponse(body) {
    let decoded = "";
    const context = {
        console,
        Math,
        Date,
        RegExp,
        String,
        decodeURIComponent,
        escape,
        window: { location: { hostname: "snaptik.app" } },
        eval(code) {
            decoded = String(code || "");
            return decoded;
        },
    };
    try {
        vm.createContext(context);
        vm.runInContext(body, context, { timeout: 3000 });
    } catch {}
    return decoded || body;
}

async function extractResult(decodedJs) {
    const dom = new Map();
    const fakeDollar = (selector) => {
        if (!dom.has(selector)) {
            dom.set(selector, {
                innerHTML: "",
                style: {},
                remove() {},
                addClass() {},
                removeClass() {},
                show() {},
                hide() {},
                html(value) {
                    if (value !== undefined) this.innerHTML = String(value);
                    return this.innerHTML;
                },
            });
        }
        return dom.get(selector);
    };

    const context = {
        console,
        Math,
        Date,
        RegExp,
        String,
        setTimeout,
        clearTimeout,
        document: {
            getElementById() {
                return { src: "", style: {} };
            },
            querySelector() {
                return { innerHTML: "", style: {} };
            },
        },
        window: { location: { hostname: "snaptik.app" } },
        gtag() {},
        fetch: async () => ({ json: async () => ({}) }),
        $: fakeDollar,
    };

    try {
        vm.createContext(context);
        vm.runInContext(decodedJs, context, { timeout: 3000 });
    } catch {}

    const html = dom.get("#download")?.innerHTML || decodedJs;
    const $ = cheerio.load(html);
    const links = [];

    $("a[href]").each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, " ");
        const href = $(el).attr("href");
        if (!href) return;
        const lowerText = text.toLowerCase();
        if (lowerText.includes("download with app")) return;
        if (lowerText.includes("download other video")) return;
        if (href === "/") return;
        if (href.includes("play.google.com")) return;
        links.push({ text: text || "Download", url: href });
    });

    const thumbnail =
        $("#thumbnail").attr("src") ||
        $(".avatar").attr("src") ||
        $("img").first().attr("src") ||
        null;

    const photoSet = new Set();
    $(".photo img, .image-tt img, .photo-list img, .images img").each((_, el) => {
        const src = $(el).attr("src");
        if (src && /^https?:\/\//.test(src)) photoSet.add(src);
    });
    $('a[href$=".jpg"], a[href$=".jpeg"], a[href$=".webp"], a[href$=".png"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href && /^https?:\/\//.test(href)) photoSet.add(href);
    });
    photoSet.delete(thumbnail || "");
    const photos = [...photoSet];

    const videoLinks = links.filter((l) => /\.mp4/i.test(l.url) || /server|download/i.test(l.text));
    const audioLinks = links.filter((l) => /\.mp3/i.test(l.url) || /\bmp3\b|audio/i.test(l.text));

    const type = photos.length > 0 ? "photo" : "video";

    return {
        type,
        title: $(".video-title").first().text().trim() || null,
        author: $(".info span").first().text().trim() || null,
        thumbnail,
        photos,
        videos: videoLinks,
        audios: audioLinks,
        render_token: $(".btn-render").attr("data-token") || null,
        links,
    };
}

async function renderVideo(jar, renderToken) {
    if (!renderToken) return null;
    const cookie = await jar.getCookieString(BASE);

    const renderRes = await axios.get(`${BASE}/render.php`, {
        timeout: 30000,
        validateStatus: () => true,
        params: { token: renderToken },
        headers: commonHeaders({ accept: "*/*", referer: PAGE, cookie }),
    });

    const taskId = renderRes.data?.task_id;
    if (!taskId) return renderRes.data;

    for (let i = 0; i < 30; i++) {
        const poll = await axios.get(`${BASE}/task.php`, {
            timeout: 30000,
            validateStatus: () => true,
            params: { token: taskId },
            headers: commonHeaders({
                accept: "*/*",
                referer: PAGE,
                cookie: await jar.getCookieString(BASE),
            }),
        });
        const data = poll.data;
        if (data?.download_url) return data;
        if (data?.status !== 0) return data;
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    return null;
}

async function snaptik(url) {
    const jar = new CookieJar();
    const home = await openHome(jar);
    const post = await submitVideo(jar, url, home.token);
    const decoded = decodeObfuscatedResponse(post.body);
    const result = await extractResult(decoded);

    let render = null;
    if (result.render_token) {
        render = await renderVideo(jar, result.render_token);
    }

    const output = {
        success: post.status === 200,
        source: "snaptik",
        input: url,
        type: result.type,
        title: result.title,
        author: result.author,
        thumbnail: result.thumbnail,
        photos: result.photos,
        videos: result.videos,
        audios: result.audios,
        links: result.links,
    };
    if (render) output.render = render;
    return output;
}

export default {
    name: 'tiktok',
    aliases: ['tt', 'ttdl'],
    description: 'Download video atau foto slideshow dari TikTok.',
    category: 'downloader',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL video TikTok. Contoh: .tiktok https://vt.tiktok.com/ZSxPtqPN8/');
            return;
        }

        const url = args[0];
        try {
            const data = await snaptik(url);
            const rawTitle = data.title || '';
            const author = data.author || '';

            const hashtagsList = rawTitle.match(/#\w+/g) || [];
            let cleanTitle = rawTitle.replace(/#\w+/g, '').trim();

            const words = cleanTitle.split(/\s+/);
            const commonTags = ['fyp', 'xyzbca', 'viral', 'roblox', 'trend', 'trending', 'foryou', 'foryoupage', 'hijrah', 'dakwah', 'capcut', 'famous', 'anime', 'gaming', 'lucu', 'meme'];
            const detectedTags = [];
            const remainingWords = [];

            for (const word of words) {
                const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (commonTags.includes(cleanWord)) {
                    detectedTags.push('#' + cleanWord);
                } else {
                    remainingWords.push(word);
                }
            }

            cleanTitle = remainingWords.join(' ').trim();
            const finalHashtags = [...new Set([...hashtagsList, ...detectedTags])].join(' ');

            let captionText = `🎬 *TIKTOK DOWNLOADER*\n\n`;
            captionText += `📝 *Deskripsi*: ${cleanTitle || '-'}\n`;
            captionText += `👤 *Kreator*: ${author || '-'}\n`;
            if (finalHashtags) {
                captionText += `🏷️ *Tagar*: ${finalHashtags}\n`;
            }
            captionText = captionText.trim();

            if (data.type === 'photo' && Array.isArray(data.photos) && data.photos.length > 0) {
                for (const photoUrl of data.photos.slice(0, 5)) {
                    await sock.sendMessage(m.from, { image: { url: photoUrl }, caption: captionText }, { quoted: m.raw });
                }
            } else {
                let videoUrl = null;
                if (data.videos && data.videos.length > 0) {
                    videoUrl = data.videos[0].url;
                } else if (data.links && data.links.length > 0) {
                    const dLink = data.links.find(l => l.text.toLowerCase().includes('video') || l.text.toLowerCase().includes('download')) || data.links[0];
                    videoUrl = dLink.url;
                } else if (data.render && data.render.download_url) {
                    videoUrl = data.render.download_url;
                }

                if (videoUrl) {
                    await sock.sendMessage(m.from, {
                        video: { url: videoUrl },
                        caption: captionText
                    }, { quoted: m.raw });
                } else {
                    await m.reply('Media tidak ditemukan atau gagal diekstrak.');
                }
            }
        } catch (err) {
            console.error('Error TikTok DL:', err);
            await m.reply(`Gagal mendownload TikTok: ${err.message}`);
        }
    }
};

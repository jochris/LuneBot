import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = "https://ssccut.com/id/";
const AJAX_URL = "https://ssccut.com/wp-admin/admin-ajax.php";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; AppleWebkit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function capcutDownload(url) {
    const { data: html } = await axios.get(BASE_URL, {
        headers: { "User-Agent": UA },
        timeout: 30000,
    });

    const $ = cheerio.load(html);
    const scriptContent = $("#video-downloader-script-js-extra").html();
    const nonceMatch = scriptContent
        ? scriptContent.match(/"nonce":"([a-zA-Z0-9]+)"/)
        : null;
    if (!nonceMatch) throw new Error("Gagal mengekstrak nonce");
    const nonce = nonceMatch[1];

    const payload = new URLSearchParams({
        action: "fetch_capcut_content",
        nonce,
        url,
    }).toString();

    const { data: response } = await axios.post(AJAX_URL, payload, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            Origin: "https://ssccut.com",
            Referer: BASE_URL,
            "User-Agent": UA,
        },
        timeout: 30000,
    });

    const d = response?.data;
    if (!d?.videoUrl) {
        throw new Error(response?.message || "Video URL kosong dari upstream");
    }

    return {
        title: d.title || null,
        quality: d.quality || null,
        thumbnail: d.thumbnail || null,
        url: d.videoUrl,
    };
}

export default {
    name: 'capcut',
    aliases: ['cc', 'ccdl'],
    description: 'Download video dari CapCut (template atau share link).',
    category: 'downloader',
    async execute(sock, m, args) {
        if (args.length === 0) {
            await m.reply('Masukkan URL CapCut. Contoh: .capcut https://www.capcut.com/tv2/ZSHBADXve');
            return;
        }

        const url = args[0];
        try {
            const data = await capcutDownload(url);

            let captionText = `🎬 *CAPCUT DOWNLOADER*\n\n`;
            captionText += `📝 *Template*: ${data.title || '-'}\n`;
            if (data.quality) {
                captionText += `🏷️ *Kualitas*: ${data.quality}\n`;
            }
            captionText = captionText.trim();

            await sock.sendMessage(m.from, {
                video: { url: data.url },
                caption: captionText
            }, { quoted: m.raw });
        } catch (err) {
            console.error('Error CapCut DL:', err);
            await m.reply(`Gagal mendownload CapCut: ${err.message}`);
        }
    }
};

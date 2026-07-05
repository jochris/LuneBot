import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const API = 'https://a.android.api.remini.ai/v1/mobile';
const ORACLE = 'https://api.remini.ai/v1/mobile/oracle';

function genId() {
    const a = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    return {
        android_id: a,
        aaid: crypto.randomUUID(),
        backup_persistent_id: a + '_com.bigwinepot.nwdn.international',
        non_backup_persistent_id: crypto.randomUUID()
    };
}

let dev = genId();
let token = null;

function bh(extra) {
    return {
        'bsp-id': 'com.bigwinepot.nwdn.international.android',
        'build-number': '202514479',
        'build-version': '3.7.1020',
        'country': 'US',
        'device-manufacturer': 'Samsung',
        'device-model': 'SM-G998B',
        'device-type': '6.8',
        'language': 'en',
        'locale': 'en_US',
        'os-version': '33',
        'platform': 'Android',
        'timezone': 'America/New_York',
        'android-id': dev.android_id,
        'aaid': dev.aaid,
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/4.12.0',
        ...(extra || {})
    };
}

function ah(extra) {
    const h = bh(extra);
    if (token) h['identity-token'] = token;
    return h;
}

async function auth() {
    dev = genId();
    const r = await fetch(ORACLE + '/setup', {
        headers: bh({
            'first-install-timestamp': Math.floor(Date.now() / 1000) + 'E9',
            'backup-persistent-id': dev.backup_persistent_id,
            'non-backup-persistent-id': dev.non_backup_persistent_id,
            'environment': 'Production',
            'settings-response-version': 'v2',
            'is-app-running-in-background': 'false',
            'is-old-user': 'true',
            'app-set-id': 'd44bd45a-a45d-4470-9674-7348a8e3fb71'
        })
    });
    const d = await r.json();
    token = d.settings.__identity__.token;
    if (!token) throw new Error('No token');
    await fetch(API + '/users/@me', { headers: ah() });
}

async function reminiHD(imagePath) {
    try {
        if (!fs.existsSync(imagePath)) return { error: 'File not found' };
        await auth();
        const ext = path.extname(imagePath).toLowerCase();
        const mm = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp'
        };
        const mime = mm[ext] || 'image/jpeg';
        const cont = fs.readFileSync(imagePath);
        const md5 = crypto.createHash('md5').update(cont).digest('base64');
        let meta = { size: fs.statSync(imagePath).size };
        try {
            const m = await sharp(imagePath).metadata();
            meta.width = m.width;
            meta.height = m.height;
        } catch (e) {}
        const taskR = await fetch(API + '/tasks', {
            method: 'POST',
            headers: ah({ 'content-type': 'application/json; charset=UTF-8' }),
            body: JSON.stringify({
                image_content_type: mime,
                image_md5: md5,
                feature: { type: 'enhance', models: [] },
                metadata: meta,
                options: { high_quality_output: false, save_input: true }
            })
        });
        const taskD = await taskR.json();
        if (!taskD.task_id || !taskD.upload_url || !taskD.upload_headers) {
            throw new Error('Missing fields');
        }
        await fetch(taskD.upload_url, {
            method: 'PUT',
            headers: {
                ...taskD.upload_headers,
                'Content-Length': cont.length,
                'User-Agent': 'okhttp/4.12.0'
            },
            body: cont
        });
        await fetch(API + '/tasks/' + taskD.task_id + '/process', {
            method: 'POST',
            headers: ah({ 'content-length': '0' })
        });
        let cdnUrl = null;
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const pr = await fetch(API + '/tasks/' + taskD.task_id, { headers: ah() });
            const pd = await pr.json();
            if (pd.status === 'completed') {
                const outs = pd.result && pd.result.outputs;
                if (outs && Array.isArray(outs) && outs[0] && outs[0].url) {
                    cdnUrl = outs[0].url;
                }
                break;
            }
            if (pd.status === 'failed' || pd.status === 'error') {
                throw new Error('Task failed');
            }
        }
        if (!cdnUrl) return { error: 'No output URL' };
        let iw = 0, ih = 0;
        try {
            const m = await sharp(imagePath).metadata();
            iw = m.width;
            ih = m.height;
        } catch (e) {}
        return {
            status: 'completed',
            input: {
                path: path.resolve(imagePath),
                size: fs.statSync(imagePath).size,
                width: iw,
                height: ih
            },
            output: { url: cdnUrl },
            upscale: iw ? '2x-4x' : 'N/A'
        };
    } catch (e) {
        const detail = e.message || String(e);
        return { error: detail };
    }
}

export default {
    name: 'hd',
    aliases: ['remini', 'enhance'],
    description: 'Meningkatkan resolusi/kualitas gambar menjadi HD.',
    category: 'media',
    async execute(sock, m, args) {
        const isImage = m.type === 'imageMessage';
        const isQuotedImage = m.quoted && m.quoted.type === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            await m.reply('Silakan kirim gambar dengan caption *.hd* atau balas (reply) gambar yang sudah ada.');
            return;
        }


        let tempFilePath = null;
        try {
            const buffer = await m.download();
            const uniqueId = crypto.randomBytes(8).toString('hex');
            tempFilePath = path.join('/root/lune', `temp_hd_${uniqueId}.jpg`);
            fs.writeFileSync(tempFilePath, buffer);

            const result = await reminiHD(tempFilePath);
            if (result.error) {
                throw new Error(result.error);
            }

            const resImg = await fetch(result.output.url);
            if (!resImg.ok) throw new Error('Gagal mengunduh gambar hasil HD');
            const enhancedBuffer = Buffer.from(await resImg.arrayBuffer());

            await sock.sendMessage(
                m.from,
                { image: enhancedBuffer, caption: 'Sukses HD!' },
                { quoted: m.raw }
            );
        } catch (err) {
            console.error('Error saat proses HD:', err);
            await m.reply(`Gagal meningkatkan kualitas gambar ke HD: ${err.message}`);
        } finally {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }
    }
};

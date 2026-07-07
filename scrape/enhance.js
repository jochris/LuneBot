import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const BASE_URL = "https://wink.ai";
const STRATEGY_URL = "https://strategy.app.meitudata.com";

const CLIENT_ID = "1189857605";
const VERSION = "5.1.2";
const COUNTRY_CODE = "ID";
const CLIENT_LANGUAGE = "en_US";
const CLIENT_TIMEZONE = "Asia/Jakarta";

const TASK_TYPE = "12";
const CONTENT_TYPE = "1";
const EXT_VALUE = "2";

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extToMime(name) {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

function fileSuffix(name) {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "jpeg") return ".jpg";
  if (ext === "jpg" || ext === "png" || ext === "webp") return `.${ext}`;
  return ".jpg";
}

function makeTrace() {
  return `${crypto.randomBytes(16).toString("hex")}-${crypto.randomBytes(8).toString("hex")}-1`;
}

function traceHeaders(transaction = "GET%20%2F%5Blocale%5D%2Fimage-enhancer%2Fupload") {
  const trace = makeTrace();
  return {
    "sentry-trace": trace,
    baggage: [
      "sentry-environment=release",
      "sentry-release=5.1.2%20(b60d25c477f43c6dfac4107810f26d442320f4f1)",
      "sentry-public_key=e1bf914f3448d9bc8a10c7e499d17d54",
      `sentry-trace_id=${trace.split("-")[0]}`,
      `sentry-transaction=${transaction}`,
      "sentry-sampled=true",
      "sentry-sample_rate=0.75",
    ].join(","),
  };
}

async function createClient() {
  const gnum = crypto.randomUUID();
  const jar = new CookieJar();
  await jar.setCookie(`_sm=${gnum}; Path=/; Domain=wink.ai`, BASE_URL);
  await jar.setCookie(
    `meitustat=${encodeURIComponent(JSON.stringify({ wgid: gnum }))}; Path=/; Domain=wink.ai`,
    BASE_URL,
  );

  const api = wrapper(
    axios.create({
      baseURL: BASE_URL,
      jar,
      withCredentials: true,
      validateStatus: () => true,
      headers: {
        accept: "*/*",
        origin: BASE_URL,
        referer: `${BASE_URL}/image-enhancer/upload`,
        "user-agent": UA,
        "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ab_info: JSON.stringify({ ab_codes: [], version: "1.4.4" }),
      },
    }),
  );

  return { api, gnum };
}

function baseParams(gnum, extra = {}) {
  return new URLSearchParams({
    client_id: CLIENT_ID,
    version: VERSION,
    country_code: COUNTRY_CODE,
    gnum,
    client_language: CLIENT_LANGUAGE,
    client_channel_id: "",
    client_timezone: CLIENT_TIMEZONE,
    ...extra,
  });
}

async function getMaatSign(api, gnum, suffix) {
  const params = baseParams(gnum, { suffix, type: "temp", count: "1" });
  const res = await api.get(`/api/file/get_maat_sign.json?${params.toString()}`, {
    headers: traceHeaders(),
  });
  if (res.status >= 400 || res.data?.code !== 0) {
    throw new Error(`get_maat_sign gagal`);
  }
  return res.data.data;
}

async function getUploadPolicy(sign) {
  const params = new URLSearchParams({
    app: sign.app,
    count: String(sign.count),
    sig: sign.sig,
    sigTime: sign.sig_time,
    sigVersion: sign.sig_version,
    suffix: sign.suffix,
    type: sign.type,
  });
  const res = await axios.get(`${STRATEGY_URL}/upload/policy?${params.toString()}`, {
    headers: {
      accept: "*/*",
      origin: BASE_URL,
      referer: `${BASE_URL}/`,
      "user-agent": UA,
      "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
    },
    validateStatus: () => true,
  });
  if (res.status >= 400 || !Array.isArray(res.data) || !res.data[0]?.qiniu) {
    throw new Error(`upload policy gagal`);
  }
  return res.data[0].qiniu;
}

async function uploadToQiniu(policy, buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, { filename, contentType: extToMime(filename) });
  form.append("token", policy.token);
  form.append("key", policy.key);
  form.append("fname", filename);

  const res = await axios.post(policy.url, form, {
    headers: form.getHeaders({
      origin: BASE_URL,
      referer: `${BASE_URL}/`,
      "user-agent": UA,
      accept: "*/*",
    }),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    throw new Error(`upload qiniu gagal HTTP ${res.status}`);
  }
  if (!res.data?.url && !res.data?.data) {
    throw new Error(`upload qiniu response tidak valid`);
  }
  return {
    file_key: policy.key,
    source_url: res.data.url || res.data.data || policy.data,
  };
}

async function getMetaInfo(api, gnum, fileKey) {
  const body = baseParams(gnum, { file_key: fileKey });
  const res = await api.post("/api/file/meta_info.json", body.toString(), {
    headers: {
      ...traceHeaders(),
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
  });
  if (res.status >= 400 || res.data?.code !== 0) throw new Error(`meta info gagal`);
  return res.data.data;
}

async function calcNeedBeans(api, gnum) {
  const typeParams = JSON.stringify({
    is_mirror: 0,
    orientation_tag: 1,
    j_420_trans: "1",
    return_ext: "2",
  });
  const rightDetail = JSON.stringify({
    source: "1",
    touch_type: "4",
    function_id: "630",
    material_id: "63011",
    url: "https://wink.ai/image-enhancer/upload",
  });
  const itemList = JSON.stringify([
    {
      type: Number(TASK_TYPE),
      ext_value: EXT_VALUE,
      content_type: Number(CONTENT_TYPE),
      duration: 0,
      type_params: typeParams,
      right_detail: rightDetail,
    },
  ]);
  const body = baseParams(gnum, { item_list: itemList });
  const res = await api.post("/api/subscribe/batch_calc_need_beans.json", body.toString(), {
    headers: {
      ...traceHeaders(),
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
  });
  if (res.status >= 400 || res.data?.code !== 0) throw new Error(`calc beans gagal`);
  return res.data.data;
}

async function delivery(api, gnum, sourceUrl, taskName) {
  const body = baseParams(gnum, {
    type: TASK_TYPE,
    content_type: CONTENT_TYPE,
    source_url: sourceUrl,
    type_params: JSON.stringify({
      is_mirror: 0,
      orientation_tag: 1,
      j_420_trans: "1",
      return_ext: "2",
    }),
    right_detail: JSON.stringify({
      source: "1",
      touch_type: "4",
      function_id: "630",
      material_id: "63011",
      url: "https://wink.ai/image-enhancer/upload",
    }),
    ext_params: JSON.stringify({ task_name: taskName, records: TASK_TYPE }),
    with_prepare: "1",
  });
  const res = await api.post("/api/meitu_ai/delivery.json", body.toString(), {
    headers: {
      ...traceHeaders(),
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
  });
  if (res.status >= 400 || res.data?.code !== 0) throw new Error(`delivery gagal`);
  const data = res.data.data || {};
  return {
    msg_id: data.msg_id || "",
    prepare_msg_id: data.prepare_msg_id || "",
  };
}

async function queryBatch(api, gnum, msgId) {
  const params = baseParams(gnum, { msg_ids: msgId });
  const res = await api.get(`/api/meitu_ai/query_batch.json?${params.toString()}`, {
    headers: {
      ...traceHeaders("%2F%3Alocale%2Feditor%2Frecent-task"),
      referer: `${BASE_URL}/image-enhancer/upload`,
    },
  });
  if (res.status >= 400 || res.data?.code !== 0) throw new Error(`query batch gagal`);
  return res.data.data;
}

function extractResultUrl(data) {
  const item = data?.item_list?.[0];
  const media = item?.result?.media_info_list?.[0];
  return media?.media_data || "";
}

function extractNextMsgId(data, currentMsgId) {
  const item = data?.item_list?.[0];
  const resultValue = item?.result?.result || "";
  const realMsgId = item?.result?.msg_id || item?.msg_id || "";
  if (
    resultValue &&
    resultValue !== currentMsgId &&
    !resultValue.startsWith("http") &&
    !resultValue.startsWith("https")
  )
    return resultValue;
  if (realMsgId && realMsgId !== currentMsgId && !realMsgId.startsWith("wpr_"))
    return realMsgId;
  return "";
}

async function waitResult(api, gnum, firstMsgId) {
  let msgId = firstMsgId;
  for (let i = 0; i < 80; i++) {
    const data = await queryBatch(api, gnum, msgId);
    const nextMsgId = extractNextMsgId(data, msgId);
    if (nextMsgId) {
      msgId = nextMsgId;
      await sleep(1000);
      continue;
    }
    const url = extractResultUrl(data);
    const errorCode = data?.item_list?.[0]?.result?.error_code;
    const errorMsg = data?.item_list?.[0]?.result?.error_msg;
    if (url && url.startsWith("http") && errorCode === 0) return url;
    if (errorCode && errorCode !== 29901 && errorCode !== 0) {
      throw new Error(`task gagal: ${errorCode} ${errorMsg || ""}`);
    }
    await sleep(3000);
  }
  throw new Error(`result belum selesai`);
}

export async function enhanceImage(buffer, filename) {
  const suffix = fileSuffix(filename);
  const { api, gnum } = await createClient();
  const sign = await getMaatSign(api, gnum, suffix);
  const policy = await getUploadPolicy(sign);
  const uploaded = await uploadToQiniu(policy, buffer, filename);
  await getMetaInfo(api, gnum, uploaded.file_key);
  await calcNeedBeans(api, gnum);
  const baseName = filename.replace(/\.[^.]+$/, "");
  const task = await delivery(api, gnum, uploaded.source_url, `Enhancer-Ultra HD-${baseName}`);
  const firstMsgId = task.msg_id || task.prepare_msg_id;
  if (!firstMsgId) throw new Error("delivery tidak mengembalikan msg_id");
  return await waitResult(api, gnum, firstMsgId);
}

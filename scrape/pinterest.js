import { CookieJar } from "tough-cookie";

const BASE = "https://id.pinterest.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0";

export async function pinterestSearch(q) {
  const jar = new CookieJar();

  const initRes = await fetch(`${BASE}/`, {
    method: "GET",
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  const setCookies = initRes.headers.getSetCookie();
  for (const c of setCookies) {
    try {
      await jar.setCookie(c, BASE);
    } catch {}
  }
  const cookieString = await jar.getCookieString(BASE);

  const sourceUrl = `/search/pins/?q=${encodeURIComponent(q)}&rs=typed`;
  const dataPayload = JSON.stringify({
    options: {
      query: q,
      scope: "pins",
      appliedProductFilters: "---",
      domains: null,
      user: null,
      seoDrawerEnabled: false,
      applied_unified_filters: null,
      auto_correction_disabled: false,
      journey_depth: null,
      source_id: null,
      source_module_id: null,
      source_url: sourceUrl,
      static_feed: false,
      selected_one_bar_modules: null,
      query_pin_sigs: null,
      page_size: null,
      price_max: null,
      price_min: null,
      query_image_pins: null,
      request_params: null,
      top_pin_ids: null,
      article: null,
      corpus: null,
      customized_rerank_type: null,
      filters: null,
      rs: "typed",
      redux_normalize_feed: true,
    },
    context: {},
  });

  const url = `${BASE}/resource/BaseSearchResource/get/?source_url=` +
    encodeURIComponent(sourceUrl) +
    `&data=` +
    encodeURIComponent(dataPayload) +
    `&_=` +
    Date.now();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "user-agent": UA,
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "en-US,en;q=0.9",
      referer: `${BASE}/`,
      "x-requested-with": "XMLHttpRequest",
      "x-pinterest-appstate": "active",
      "x-pinterest-source-url": "/",
      "x-pinterest-pws-handler": "www/index.js",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      cookie: cookieString,
    },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Response upstream bukan JSON");
  }

  const ok = data?.resource_response?.status === "success";
  if (!res.ok || !ok) {
    throw new Error(data?.resource_response?.error?.message || `Upstream status ${res.status}`);
  }

  const results = Array.isArray(data?.resource_response?.data?.results)
    ? data.resource_response.data.results
    : [];

  return results
    .filter((pin) => pin && pin.id)
    .map((pin) => ({
      id: pin.id,
      title: pin.grid_title || pin.title || null,
      description: pin.description || null,
      image: pin.images?.orig?.url || null,
      link: pin.link || null,
      domain: pin.domain || null,
      pinner: pin.pinner?.full_name || null,
      username: pin.pinner?.username || null,
      likes: pin.reaction_counts?.["1"] || 0,
      created_at: pin.created_at || null,
    }));
}

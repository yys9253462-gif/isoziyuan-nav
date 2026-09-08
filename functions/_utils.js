const encoder = new TextEncoder();
const SESSION_COOKIE = "isoziyuan_nav_admin";
const SESSION_TTL = 60 * 60 * 24 * 7;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function createSession(username, secret) {
  const payload = `${username}.${Date.now() + SESSION_TTL * 1000}`;
  return `${toBase64Url(encoder.encode(payload))}.${await sign(payload, secret)}`;
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const entry = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

export async function getSession(request, secret) {
  if (!secret) return null;
  const token = getCookie(request, SESSION_COOKIE);
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const payload = new TextDecoder().decode(fromBase64Url(encoded));
    if (!safeEqual(signature, await sign(payload, secret))) return null;
    const [username, expiresAt] = payload.split(".");
    if (!username || Number(expiresAt) < Date.now()) return null;
    return { username };
  } catch {
    return null;
  }
}

export async function requireSession(request, env) {
  const session = await getSession(request, env.ADMIN_PASSWORD || "");
  if (!session || (env.ADMIN_USERNAME && session.username !== env.ADMIN_USERNAME)) {
    return { response: json({ success: false, error: "请先登录管理员后台" }, 401) };
  }
  return { session };
}

export function sessionCookie(token, maxAge = SESSION_TTL) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export async function requestJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function normalizeNavData(input) {
  if (!Array.isArray(input) || input.length > 50) throw new Error("分类数据格式无效");
  return input.map((category, categoryIndex) => {
    if (!category || !String(category.id || "").trim() || !String(category.name || "").trim()) {
      throw new Error("分类名称和 ID 不能为空");
    }
    const items = Array.isArray(category.items) ? category.items : [];
    if (items.length > 200) throw new Error("单个分类的网站数量不能超过 200 个");
    return {
      id: String(category.id).trim().slice(0, 80),
      name: String(category.name).trim().slice(0, 100),
      icon: String(category.icon || "Sparkles").slice(0, 40),
      items: items.map((item, itemIndex) => {
        if (!item || !String(item.name || "").trim() || !String(item.url || "").trim()) {
          throw new Error("网站名称和链接不能为空");
        }
        let url;
        try {
          url = new URL(String(item.url).trim()).toString();
          if (!["http:", "https:"].includes(new URL(url).protocol)) throw new Error();
        } catch {
          throw new Error(`网站链接无效：${item.name || "未命名网站"}`);
        }
        return {
          id: String(item.id || crypto.randomUUID()).slice(0, 80),
          name: String(item.name).trim().slice(0, 120),
          desc: String(item.desc || "").trim().slice(0, 500),
          url,
          tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim().slice(0, 40)).filter(Boolean).slice(0, 10) : [],
          badge: String(item.badge || "").trim().slice(0, 40),
          color: /^#[0-9a-f]{6}$/i.test(String(item.color || "")) ? String(item.color) : "#6366f1",
          _categoryIndex: categoryIndex,
          _itemIndex: itemIndex,
        };
      }),
    };
  });
}

export async function loadNavData(db) {
  const categories = await db.prepare("SELECT id, name, icon, sort_order FROM categories ORDER BY sort_order, rowid").all();
  const items = await db.prepare("SELECT id, category_id, name, description, url, tags_json, badge, color, sort_order FROM nav_items ORDER BY sort_order, rowid").all();
  const byCategory = new Map();
  (categories.results || []).forEach((category) => byCategory.set(category.id, { id: category.id, name: category.name, icon: category.icon, items: [] }));
  (items.results || []).forEach((item) => {
    const category = byCategory.get(item.category_id);
    if (!category) return;
    let tags = [];
    try { tags = JSON.parse(item.tags_json || "[]"); } catch { tags = []; }
    category.items.push({ id: item.id, name: item.name, desc: item.description || "", url: item.url, tags, badge: item.badge || "", color: item.color || "#6366f1" });
  });
  return Array.from(byCategory.values());
}

export async function saveNavData(db, input) {
  const data = normalizeNavData(input);
  const statements = [db.prepare("DELETE FROM nav_items"), db.prepare("DELETE FROM categories")];
  data.forEach((category, categoryIndex) => {
    statements.push(db.prepare("INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)").bind(category.id, category.name, category.icon, categoryIndex));
    category.items.forEach((item, itemIndex) => {
      statements.push(db.prepare("INSERT INTO nav_items (id, category_id, name, description, url, tags_json, badge, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, category.id, item.name, item.desc, item.url, JSON.stringify(item.tags), item.badge, item.color, itemIndex));
    });
  });
  await db.batch(statements);
  return data;
}

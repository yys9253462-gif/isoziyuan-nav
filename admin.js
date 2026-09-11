let navData = [];
let contact = defaultContact();
let siteConfig = defaultSiteConfig();
let selectedCategoryId = "";
let itemIconData = "";

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
function defaultSiteConfig() { return { siteName: "爱搜资源", siteSubtitle: "服务导航", browserTitle: "服务导航 - 谷歌服务器专属工作台" }; }
function defaultContact() { return { enabled: false, title: "联系站长", description: "需要合作或资源交流，欢迎联系。", email: "", wechat: "", qq: "", telegram: "" }; }
function normalizeContact(value) { const raw = value && typeof value === "object" ? value : {}; return { enabled: Boolean(raw.enabled), title: String(raw.title || "联系站长").slice(0, 60), description: String(raw.description || "需要合作或资源交流，欢迎联系。").slice(0, 240), email: String(raw.email || "").slice(0, 160), wechat: String(raw.wechat || "").slice(0, 80), qq: String(raw.qq || "").slice(0, 40), telegram: String(raw.telegram || "").slice(0, 200) }; }
let statusTimer = null;
function status(message, error = false) {
  const login = $("login-panel");
  const isLoginPage = login && !login.classList.contains("hidden");
  const node = isLoginPage ? $("login-status") : $("admin-status");
  if (!node) return;
  node.textContent = message;
  node.className = `status ${error ? "error" : "ok"}`;
  
  if (!isLoginPage && message) {
    const container = $("status-container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    clearTimeout(statusTimer);
    if (!error) {
      statusTimer = setTimeout(() => {
        node.className = "status";
        node.textContent = "";
      }, 7000);
    }
  }
}
function selectedCategory() { return navData.find((category) => category.id === selectedCategoryId); }
function renderCategories() {
  $("category-list").innerHTML = navData.length ? navData.map((category) => `<button type="button" class="category ${category.id === selectedCategoryId ? "active" : ""}" data-id="${escapeHtml(category.id)}"><span>${escapeHtml(category.name)}</span><small>${category.items.length}</small></button>`).join("") : '<div class="empty">还没有分类</div>';
  document.querySelectorAll(".category").forEach((node) => node.addEventListener("click", () => { selectedCategoryId = node.dataset.id; $("category-name").value = selectedCategory()?.name || ""; renderCategories(); renderItems(); }));
  $("metric-categories").textContent = navData.length; $("category-count").textContent = navData.length;
}
function renderItems() {
  const category = selectedCategory();
  const count = category?.items.length || 0;
  $("selected-category").textContent = category ? `当前分类：${category.name}` : "请选择一个分类";
  $("item-list").innerHTML = count ? category.items.map((item, index) => `<div class="item-row"><div class="item-row-main"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.url)}</span><small>${escapeHtml(item.desc || "暂无描述")}</small></div><div class="item-actions"><button type="button" data-edit="${index}">编辑</button><button type="button" class="danger-text" data-delete="${index}">删除</button></div></div>`).join("") : '<div class="empty">当前分类还没有网站，使用下方表单添加一个入口。</div>';
  document.querySelectorAll("[data-edit]").forEach((node) => node.addEventListener("click", () => fillItem(category.items[Number(node.dataset.edit)])));
  document.querySelectorAll("[data-delete]").forEach((node) => node.addEventListener("click", () => { if (!confirm("确定删除这个网站吗？")) return; category.items.splice(Number(node.dataset.delete), 1); renderCategories(); renderItems(); status("网站已删除，请点击保存全部修改。"); }));
  $("metric-items").textContent = navData.reduce((total, current) => total + current.items.length, 0); $("item-count").textContent = count;
}
function setIconPreview(icon) { $("item-icon-preview").innerHTML = icon ? `<img src="${escapeHtml(icon)}" alt="自定义图标"><span>已选择自定义图标</span>` : "未设置自定义图标"; }
function fillItem(item) { $("item-id").value = item.id || ""; $("item-name").value = item.name || ""; $("item-url").value = item.url || ""; $("item-desc").value = item.desc || ""; $("item-tags").value = (item.tags || []).join(", "); $("item-badge").value = item.badge || ""; $("item-color").value = item.color || "#6366f1"; itemIconData = item.icon || ""; $("item-icon").value = ""; setIconPreview(itemIconData); document.querySelector(".item-editor-wrap").scrollIntoView({ behavior: "smooth", block: "center" }); }
function clearItem() { ["item-id", "item-name", "item-url", "item-desc", "item-tags", "item-badge"].forEach((id) => $(id).value = ""); $("item-color").value = "#6366f1"; $("item-icon").value = ""; itemIconData = ""; setIconPreview(""); }
function fillSiteConfig(value) {
  const raw = value && typeof value === "object" ? value : {};
  siteConfig = {
    siteName: String(raw.siteName || defaultSiteConfig().siteName).slice(0, 60),
    siteSubtitle: String(raw.siteSubtitle || defaultSiteConfig().siteSubtitle).slice(0, 60),
    browserTitle: String(raw.browserTitle || defaultSiteConfig().browserTitle).slice(0, 100),
  };
  if ($("site-name")) $("site-name").value = siteConfig.siteName;
  if ($("site-subtitle")) $("site-subtitle").value = siteConfig.siteSubtitle;
  if ($("site-browser-title")) $("site-browser-title").value = siteConfig.browserTitle;
}
function readSiteConfig() {
  return {
    siteName: ($("site-name") ? $("site-name").value.trim() : "") || defaultSiteConfig().siteName,
    siteSubtitle: $("site-subtitle") ? $("site-subtitle").value.trim() : "",
    browserTitle: $("site-browser-title") ? $("site-browser-title").value.trim() : "",
  };
}
function fillContact(value) { contact = normalizeContact(value); $("contact-enabled").checked = contact.enabled; $("contact-title").value = contact.title; $("contact-description").value = contact.description; $("contact-email").value = contact.email; $("contact-wechat").value = contact.wechat; $("contact-qq").value = contact.qq; $("contact-telegram").value = contact.telegram; }
function readContact() { return normalizeContact({ enabled: $("contact-enabled").checked, title: $("contact-title").value, description: $("contact-description").value, email: $("contact-email").value, wechat: $("contact-wechat").value, qq: $("contact-qq").value, telegram: $("contact-telegram").value }); }
function render() { renderCategories(); renderItems(); }
async function api(url, options = {}) { const response = await fetch(url, { headers: { "content-type": "application/json", ...(options.headers || {}) }, ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "请求失败"); return data; }
async function load() { try { const result = await api("/api/admin/nav"); navData = result.data || []; fillContact(result.contact); fillSiteConfig(result.site); if (!navData.length) { navData = await fetch("/data.json").then((response) => response.json()); status("数据库为空，已载入现有 data.json，请点击“保存全部”完成导入。"); } selectedCategoryId = navData[0]?.id || ""; $("category-name").value = selectedCategory()?.name || ""; render(); } catch (error) { if (error.message.includes("登录")) { $("admin-panel").classList.add("hidden"); $("login-panel").classList.remove("hidden"); } status(error.message, true); } }

$("login-form").addEventListener("submit", async (event) => { event.preventDefault(); try { await api("/api/admin/login", { method: "POST", body: JSON.stringify({ username: $("username").value, password: $("password").value }) }); $("login-panel").classList.add("hidden"); $("admin-panel").classList.remove("hidden"); await load(); } catch (error) { $("login-status").textContent = error.message; $("login-status").className = "status error"; } });
$("logout").addEventListener("click", async () => { await api("/api/admin/logout", { method: "POST" }); location.reload(); });
$("add-category").addEventListener("click", () => { const name = $("category-name").value.trim(); if (!name) return status("请先填写分类名称", true); const id = `cat-${crypto.randomUUID()}`; navData.push({ id, name, icon: "Sparkles", items: [] }); selectedCategoryId = id; render(); status("分类已添加，请点击保存全部修改。"); });
$("rename-category").addEventListener("click", () => { const category = selectedCategory(); const name = $("category-name").value.trim(); if (!category || !name) return status("请选择分类并填写名称", true); category.name = name; render(); status("分类名称已修改，请点击保存全部修改。"); });
$("delete-category").addEventListener("click", () => { if (!selectedCategory()) return status("请先选择分类", true); if (!confirm("删除分类会同时删除其中的网站，确定继续吗？")) return; navData = navData.filter((category) => category.id !== selectedCategoryId); selectedCategoryId = navData[0]?.id || ""; $("category-name").value = selectedCategory()?.name || ""; render(); status("分类已删除，请点击保存全部修改。"); });
$("item-icon").addEventListener("change", () => { const file = $("item-icon").files[0]; if (!file) return; const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]; if (!allowed.includes(file.type)) return status("图标仅支持 PNG、JPG、WebP、SVG 或 ICO", true); if (file.size > 350 * 1024) return status("图标不能超过 350 KB", true); const reader = new FileReader(); reader.onload = () => { itemIconData = reader.result; setIconPreview(itemIconData); }; reader.readAsDataURL(file); });
$("item-form").addEventListener("submit", (event) => { event.preventDefault(); const category = selectedCategory(); if (!category) return status("请先选择分类", true); const item = { id: $("item-id").value || crypto.randomUUID(), name: $("item-name").value.trim(), url: $("item-url").value.trim(), desc: $("item-desc").value.trim(), tags: $("item-tags").value.split(",").map((tag) => tag.trim()).filter(Boolean), badge: $("item-badge").value.trim(), color: $("item-color").value, icon: itemIconData }; if (!item.name || !item.url) return status("网站名称和链接不能为空", true); const index = category.items.findIndex((current) => current.id === item.id); if (index >= 0) category.items[index] = item; else category.items.push(item); clearItem(); render(); status("网站已修改，请点击保存全部修改。"); });
$("clear-item").addEventListener("click", clearItem);
$("save-all").addEventListener("click", async () => {
  try {
    $("save-all").disabled = true;
    const result = await api("/api/admin/nav", {
      method: "PUT",
      body: JSON.stringify({ data: navData, contact: readContact(), site: readSiteConfig() }),
    });
    navData = result.data || navData;
    fillContact(result.contact);
    fillSiteConfig(result.site);
    render();

    // 广播跨标签实时同步事件给前台
    try {
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("isoziyuan_nav_sync");
        channel.postMessage({ type: "NAV_UPDATED", timestamp: Date.now() });
        channel.close();
      }
      localStorage.setItem("nav_last_saved", String(Date.now()));
    } catch (e) {}

    status("已保存到 Cloudflare D1，首页已实时同步！");
  } catch (error) {
    status(error.message, true);
  } finally {
    $("save-all").disabled = false;
  }
});

// Tab 切换控制器
const TAB_META = {
  "tab-nav": {
    eyebrow: "CONTENT CENTER",
    title: "导航内容",
    subtitle: "在这里管理网站分类与入口网站。"
  },
  "tab-site": {
    eyebrow: "SITE CONFIGURATION",
    title: "站点设置",
    subtitle: "自定义导航首页品牌名、副标与浏览器标签标题。"
  },
  "tab-contact": {
    eyebrow: "CONTACT CHANNELS",
    title: "联系方式",
    subtitle: "独立管理站长联系方式，开启后在全网前端展示。"
  }
};

document.querySelectorAll(".sidebar-link[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab;
    // 切换按钮激活态
    document.querySelectorAll(".sidebar-link[data-tab]").forEach((b) => b.classList.toggle("active", b === btn));
    // 切换内容面板
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      const isTarget = pane.id === targetTab;
      pane.classList.toggle("active", isTarget);
      pane.classList.toggle("hidden", !isTarget);
    });
    // 切换顶部标题
    const meta = TAB_META[targetTab];
    if (meta) {
      if ($("current-view-eyebrow")) $("current-view-eyebrow").textContent = meta.eyebrow;
      if ($("current-view-title")) $("current-view-title").textContent = meta.title;
      if ($("current-view-subtitle")) $("current-view-subtitle").textContent = meta.subtitle;
    }
  });
});



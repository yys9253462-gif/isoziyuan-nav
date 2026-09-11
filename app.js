let navData = [];
let contact = defaultContact();

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[char]));
const safeColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#6366f1';
const safeIcon = (value) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(String(value || '')) ? value : '';
function defaultContact() { return { enabled: false, title: '联系站长', description: '需要合作或资源交流，欢迎联系。', email: '', wechat: '', qq: '', telegram: '' }; }
function normalizeContact(value) {
  const raw = value && typeof value === 'object' ? value : {};
  return { enabled: Boolean(raw.enabled), title: String(raw.title || '联系站长').slice(0, 60), description: String(raw.description || '需要合作或资源交流，欢迎联系。').slice(0, 240), email: String(raw.email || '').slice(0, 160), wechat: String(raw.wechat || '').slice(0, 80), qq: String(raw.qq || '').slice(0, 40), telegram: String(raw.telegram || '').slice(0, 200) };
}

// 初始化图标映射 (简化 SVG)
const ICONS = {
  MessageSquare: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  Code2: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>`,
  Palette: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>`,
  Video: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>`,
  Headphones: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  Sparkles: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
};

// 渲染侧边栏
function renderSidebar() {
  const container = document.getElementById('nav-links');
  container.innerHTML = navData.map(cat => `
    <a href="#cat-${escapeHtml(cat.id)}" class="nav-item">
      ${ICONS[cat.icon] || ''}
      <span>${escapeHtml(cat.name)}</span>
    </a>
  `).join('');
}

// 渲染主列表
function renderContent(filterText = '') {
  const container = document.getElementById('content-area');
  const emptyState = document.getElementById('empty-state');
  const term = filterText.toLowerCase().trim();
  let totalVisible = 0;

  const html = navData.map(cat => {
    const matchedItems = cat.items.filter(item => {
      if (!term) return true;
      const matchName = item.name.toLowerCase().includes(term);
      const matchDesc = item.desc.toLowerCase().includes(term);
      const matchTags = item.tags && item.tags.some(t => t.toLowerCase().includes(term));
      return matchName || matchDesc || matchTags;
    });

    if (matchedItems.length === 0) return '';
    totalVisible += matchedItems.length;

    const cardsHtml = matchedItems.map(item => `
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="tool-card">
        <div class="card-top">
          <div class="tool-avatar" style="background: ${safeColor(item.color)}">
            ${safeIcon(item.icon) ? `<img src="${escapeHtml(item.icon)}" alt="">` : escapeHtml(item.name.charAt(0))}
          </div>
          <div class="tool-info">
            <div class="tool-name-row">
              <span class="tool-name">${escapeHtml(item.name)}</span>
              ${item.badge ? `<span class="tool-badge">${escapeHtml(item.badge)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="tool-desc">${escapeHtml(item.desc)}</div>
        <div class="tool-footer">
          <div class="tag-list">
            ${(item.tags || []).map(tag => `<span class="tag-item">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <svg class="link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
        </div>
      </a>
    `).join('');

    return `
      <section id="cat-${escapeHtml(cat.id)}" class="category-section">
        <div class="category-header">
          ${ICONS[cat.icon] || ''}
          <h2 class="category-title">${escapeHtml(cat.name)}</h2>
          <span class="category-count">${matchedItems.length}</span>
        </div>
        <div class="tools-grid">
          ${cardsHtml}
        </div>
      </section>
    `;
  }).join('');

  container.innerHTML = html;
  emptyState.style.display = totalVisible === 0 ? 'block' : 'none';
}

// 主题切换
function initTheme() {
  const saved = localStorage.getItem('ai-nav-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ai-nav-theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  btn.innerHTML = theme === 'dark' ? 
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>` : 
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
}

// 搜索事件 & 快捷键
function initSearch() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    renderContent(e.target.value);
  });

  // 按 '/' 键聚焦搜索框
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

// 移动端菜单
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const bottomNav = document.getElementById('mobile-bottom-nav');
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (bottomNav && bottomNav.contains(e.target)) return;
    if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

function renderContact() {
  const title = document.getElementById('contact-title');
  const description = document.getElementById('contact-description');
  const list = document.getElementById('contact-list');
  title.textContent = contact.title;
  description.textContent = contact.description;
  list.innerHTML = '';
  const values = [['邮箱', contact.email, 'email'], ['微信', contact.wechat, 'text'], ['QQ', contact.qq, 'text'], ['Telegram', contact.telegram, 'telegram']].filter(([, value]) => value);
  if (!contact.enabled || values.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'contact-empty';
    empty.textContent = contact.enabled ? '站长暂未填写联系方式。' : '联系方式暂未开放。';
    list.appendChild(empty);
    return;
  }
  values.forEach(([label, value, type]) => {
    const row = document.createElement('div');
    row.className = 'contact-row';
    const labelNode = document.createElement('span');
    labelNode.className = 'contact-label';
    labelNode.textContent = label;
    row.appendChild(labelNode);
    if (type === 'email') {
      const link = document.createElement('a');
      link.href = `mailto:${value}`;
      link.textContent = value;
      row.appendChild(link);
    } else if (type === 'telegram') {
      const tgUrl = /^https?:\/\//i.test(value) ? value : `https://t.me/${value.replace(/^@/, '')}`;
      const link = document.createElement('a');
      link.href = tgUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = value;
      row.appendChild(link);
    } else {
      const text = document.createElement('span');
      text.textContent = value;
      row.appendChild(text);
    }
    list.appendChild(row);
  });
}

function initContactModal() {
  const modal = document.getElementById('contact-modal');
  const close = () => { modal.hidden = true; };
  document.getElementById('contact-close').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

function initMobileBottomNav() {
  const sidebar = document.getElementById('sidebar');
  const searchInput = document.getElementById('search-input');
  const modal = document.getElementById('contact-modal');
  document.querySelectorAll('[data-mobile-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.mobileAction;
      document.querySelectorAll('.bottom-nav-item').forEach((item) => item.classList.toggle('active', item === button));
      if (action === 'home') { sidebar.classList.remove('open'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (action === 'categories') { sidebar.classList.add('open'); }
      if (action === 'search') { sidebar.classList.remove('open'); searchInput.focus({ preventScroll: true }); searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      if (action === 'contact') { sidebar.classList.remove('open'); modal.hidden = false; }
    });
  });
}

// 启动与实时刷新机制
let isInitialized = false;

function applySiteConfig(site) {
  if (!site || typeof site !== 'object') return;
  const brandEl = document.getElementById('brand-title');
  if (brandEl) {
    if (site.siteName && site.siteSubtitle) {
      brandEl.textContent = `${site.siteName} · ${site.siteSubtitle}`;
    } else if (site.siteName) {
      brandEl.textContent = site.siteName;
    }
  }
  if (site.browserTitle) {
    document.title = site.browserTitle;
  } else if (site.siteName) {
    document.title = `${site.siteName} - 精选导航`;
  }
}

async function fetchNavConfig() {
  const query = `?_t=${Date.now()}`;
  try {
    const res = await fetch('/api/nav' + query, { cache: 'no-store' });
    if (!res.ok) throw new Error('API unavailable');
    const result = await res.json();
    if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error('No database data');
    }
    return { data: result.data, contact: result.contact, site: result.site };
  } catch (err) {
    const data = await fetch('data.json' + query, { cache: 'no-store' }).then(r => r.json());
    return { data, contact: defaultContact(), site: null };
  }
}

async function applyNavPayload(payload) {
  navData = payload.data;
  contact = normalizeContact(payload.contact);
  if (payload.site) applySiteConfig(payload.site);
  renderSidebar();
  const searchInput = document.getElementById('search-input');
  renderContent(searchInput ? searchInput.value : '');
  renderContact();

  if (!isInitialized) {
    isInitialized = true;
    initTheme();
    initSearch();
    initMobileMenu();
    initContactModal();
    initMobileBottomNav();
    setupLiveSync();
  }
}

function setupLiveSync() {
  // 1. BroadcastChannel 跨标签实时通知
  if ('BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('isoziyuan_nav_sync');
      channel.onmessage = async (event) => {
        if (event?.data?.type === 'NAV_UPDATED') {
          try {
            const payload = await fetchNavConfig();
            await applyNavPayload(payload);
          } catch (e) {
            console.error('实时更新导航失败:', e);
          }
        }
      };
    } catch (e) {
      // 忽略不支持的情况
    }
  }

  // 2. Storage 事件跨标签兜底监听
  window.addEventListener('storage', async (event) => {
    if (event.key === 'nav_last_saved') {
      try {
        const payload = await fetchNavConfig();
        await applyNavPayload(payload);
      } catch (e) {
        console.error('存储同步更新导航失败:', e);
      }
    }
  });

  // 3. 标签页切回前台时，自动比对并拉取最新数据
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        const payload = await fetchNavConfig();
        await applyNavPayload(payload);
      } catch (e) {}
    }
  });
}

fetchNavConfig()
  .then(applyNavPayload)
  .catch(err => {
    console.error('加载配置失败:', err);
  });


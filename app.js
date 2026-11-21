/* AI理想网 · 旗舰导航交互脚本（双主题 + 分类筛选 + 实时同步 + 物理鼠标跟随动效） */

let navData = [];
let contact = defaultContact();
let activeCategory = 'all';
let toastTimer = null;

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));

const safeColor = (value) => (/^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#0b7566');
const safeIcon = (value) => (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(String(value || '')) ? value : '');

function defaultContact() {
  return {
    enabled: false,
    title: '联系站长',
    description: '需要合作或资源交流，欢迎联系。',
    email: '',
    wechat: '',
    qq: '',
    telegram: ''
  };
}

function normalizeContact(value) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    enabled: Boolean(raw.enabled),
    title: String(raw.title || '联系站长').slice(0, 60),
    description: String(raw.description || '需要合作或资源交流，欢迎联系。').slice(0, 240),
    email: String(raw.email || '').slice(0, 160),
    wechat: String(raw.wechat || '').slice(0, 80),
    qq: String(raw.qq || '').slice(0, 40),
    telegram: String(raw.telegram || '').slice(0, 200)
  };
}

// 精简矢量图标映射
const ICONS = {
  MessageSquare: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  Code2: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>`,
  Palette: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>`,
  Video: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>`,
  Headphones: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  Sparkles: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
};

function badgeTone(badge) {
  const b = String(badge || '');
  if (/核心|旗舰|主站|自营/.test(b)) return 'gold';
  if (/后台/.test(b)) return 'muted';
  return 'emerald';
}

function showToast(text) {
  const el = document.getElementById('toast-bar');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 220);
  }, 1800);
}

async function copyUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    showToast(`已复制链接：${url}`);
  } catch {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    showToast(`已复制链接：${url}`);
  }
}

function closeDrawer() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('on');
}

function openDrawer() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-backdrop')?.classList.add('on');
}

// 渲染侧边栏与底部统计
function renderSidebar() {
  const container = document.getElementById('nav-links');
  const totalItems = navData.reduce((sum, cat) => sum + (cat.items ? cat.items.length : 0), 0);
  const statServices = document.getElementById('stat-services');
  const statCategories = document.getElementById('stat-categories');
  if (statServices) statServices.textContent = String(totalItems);
  if (statCategories) statCategories.textContent = String(navData.length);

  container.innerHTML = navData.map((cat, idx) => `
    <a href="#cat-${escapeHtml(cat.id)}" class="nav-item${idx === 0 ? ' active' : ''}" data-cat-id="${escapeHtml(cat.id)}">
      <span class="nav-ico">${ICONS[cat.icon] || ICONS.Sparkles}</span>
      <span class="nav-text">${escapeHtml(cat.name)}</span>
      <span class="nav-num">${(cat.items || []).length}</span>
    </a>
  `).join('');

  container.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      activeCategory = 'all';
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';
      syncSearchControls();
      renderCategoryFilters();
      renderContent('');
      container.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n === link));
      closeDrawer();
    });
  });
}

// 渲染快捷分类筛选胶囊
function renderCategoryFilters() {
  const wrap = document.getElementById('category-filters');
  if (!wrap) return;
  const totalItems = navData.reduce((sum, cat) => sum + (cat.items ? cat.items.length : 0), 0);
  const buttons = [
    `<button type="button" data-filter="all" aria-pressed="${activeCategory === 'all'}">全部服务 <em>${totalItems}</em></button>`,
    ...navData.map((cat) =>
      `<button type="button" data-filter="${escapeHtml(cat.id)}" aria-pressed="${activeCategory === cat.id}">${escapeHtml(cat.name)} <em>${(cat.items || []).length}</em></button>`
    )
  ];
  wrap.innerHTML = buttons.join('');
  wrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.filter || 'all';
      renderCategoryFilters();
      const q = document.getElementById('search-input')?.value || '';
      renderContent(q);
    });
  });
}

function syncSearchControls() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const badge = document.getElementById('shortcut-badge');
  const hasVal = Boolean(input && input.value.trim());
  if (clearBtn) clearBtn.hidden = !hasVal;
  if (badge) badge.hidden = hasVal;
}

// 渲染主服务网格
function renderContent(filterText = '') {
  const container = document.getElementById('content-area');
  const emptyState = document.getElementById('empty-state');
  const resultsBar = document.getElementById('results-bar');
  const resultsText = document.getElementById('results-text');
  const term = filterText.toLowerCase().trim();
  let totalVisible = 0;

  const html = navData
    .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
    .map((cat) => {
      const matchedItems = (cat.items || []).filter((item) => {
        if (!term) return true;
        const matchName = String(item.name || '').toLowerCase().includes(term);
        const matchDesc = String(item.desc || '').toLowerCase().includes(term);
        const matchTags = item.tags && item.tags.some((t) => String(t).toLowerCase().includes(term));
        const matchCat = String(cat.name || '').toLowerCase().includes(term);
        const matchUrl = String(item.url || '').toLowerCase().includes(term);
        return matchName || matchDesc || matchTags || matchCat || matchUrl;
      });

      if (matchedItems.length === 0) return '';
      totalVisible += matchedItems.length;

      const cardsHtml = matchedItems.map((item, idx) => {
        const href = safeUrl(item.url);
        let host = '';
        try {
          host = new URL(href, location.origin).hostname;
        } catch {
          host = '';
        }
        const tone = badgeTone(item.badge);
        return `
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="tool-card" style="--stagger:${Math.min(idx, 7) * 45}ms" aria-label="${escapeHtml(item.name)}（新窗口打开）">
            <div class="card-top">
              <div class="tool-avatar" style="--avatar-bg:${safeColor(item.color)}">
                ${safeIcon(item.icon) ? `<img src="${escapeHtml(item.icon)}" alt="">` : escapeHtml(String(item.name || '?').charAt(0))}
              </div>
              <div class="tool-info">
                <div class="tool-name-row">
                  <span class="tool-name">${escapeHtml(item.name)}</span>
                  ${item.badge ? `<span class="tool-badge tone-${tone}">${escapeHtml(item.badge)}</span>` : ''}
                </div>
                <div class="tool-domain">
                  <i class="domain-dot" aria-hidden="true"></i>
                  <span>${escapeHtml(host)}</span>
                </div>
              </div>
            </div>
            <div class="tool-desc">${escapeHtml(item.desc)}</div>
            <div class="tool-footer">
              <div class="tag-list">
                ${(item.tags || []).map((tag) => `<span class="tag-item">${escapeHtml(tag)}</span>`).join('')}
              </div>
              <div class="card-actions">
                <button type="button" class="copy-link-btn" data-copy-url="${escapeHtml(href)}" aria-label="复制 ${escapeHtml(item.name)} 链接" title="复制链接">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <span class="link-arrow" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
                </span>
              </div>
            </div>
          </a>
        `;
      }).join('');

      return `
        <section id="cat-${escapeHtml(cat.id)}" class="category-section" data-section-cat="${escapeHtml(cat.id)}">
          <div class="category-header">
            <span class="category-icon">${ICONS[cat.icon] || ICONS.Sparkles}</span>
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
  emptyState.style.display = totalVisible === 0 ? 'flex' : 'none';

  // 绑定卡片内一键复制按钮
  container.querySelectorAll('.copy-link-btn').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const url = btn.dataset.copyUrl;
      if (url && url !== '#') void copyUrl(url);
    });
  });

  // 筛选或搜索结果提示条
  const filtering = Boolean(term || activeCategory !== 'all');
  if (resultsBar && resultsText) {
    resultsBar.hidden = !filtering;
    if (filtering) {
      const catObj = navData.find((c) => c.id === activeCategory);
      const parts = [];
      if (catObj) parts.push(`分类「${catObj.name}」`);
      if (term) parts.push(`关键词「${filterText.trim()}」`);
      resultsText.textContent = `已筛选 ${parts.join(' · ')}，共找到 ${totalVisible} 项服务`;
    }
  }
}

function resetAllFilters() {
  activeCategory = 'all';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  syncSearchControls();
  renderCategoryFilters();
  renderContent('');
}

// 主题切换（默认暗夜祖母绿黑金，支持手动切换浅色）
function initTheme() {
  const saved = localStorage.getItem('ai-nav-theme-v2') || 'dark';
  applyTheme(saved);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('ai-nav-theme-v2', next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#07100e' : '#f6f4ee');
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.title = theme === 'dark' ? '切换为温润羊皮纸浅色模式' : '切换为暗夜祖母绿深色模式';
  btn.innerHTML =
    theme === 'dark'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
}

// 搜索事件、清空按钮与快捷键
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  searchInput.addEventListener('input', (e) => {
    syncSearchControls();
    renderContent(e.target.value);
  });
  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    syncSearchControls();
    renderContent('');
    searchInput.focus();
  });
  document.getElementById('reset-search')?.addEventListener('click', resetAllFilters);
  document.getElementById('empty-reset-btn')?.addEventListener('click', resetAllFilters);

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

// 移动端侧边抽屉
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  btn.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeDrawer();
    else openDrawer();
  });
  backdrop?.addEventListener('click', closeDrawer);
}

// 滚动监听侧边栏当前激活分类
function initScrollSpy() {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      const sections = document.querySelectorAll('.category-section');
      let currentId = '';
      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= 160) currentId = sec.dataset.sectionCat || '';
      });
      if (!currentId && sections.length) currentId = sections[0].dataset.sectionCat || '';
      document.querySelectorAll('#nav-links .nav-item').forEach((link) => {
        link.classList.toggle('active', link.dataset.catId === currentId);
      });
    });
  }, { passive: true });
}

// 渲染联系弹窗
function renderContact() {
  const title = document.getElementById('contact-title');
  const description = document.getElementById('contact-description');
  const list = document.getElementById('contact-list');
  title.textContent = contact.title;
  description.textContent = contact.description;
  list.innerHTML = '';

  const values = [
    ['邮箱', contact.email, 'email'],
    ['微信', contact.wechat, 'text'],
    ['QQ', contact.qq, 'text'],
    ['Telegram', contact.telegram, 'telegram']
  ].filter(([, value]) => value);

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
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'contact-copy';
      copyBtn.textContent = value;
      copyBtn.title = `点击复制${label}`;
      copyBtn.addEventListener('click', () => { void copyUrl(value); });
      row.appendChild(copyBtn);
    }
    list.appendChild(row);
  });
}

function initContactModal() {
  const modal = document.getElementById('contact-modal');
  const close = () => { modal.hidden = true; };
  document.getElementById('contact-close').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { close(); closeDrawer(); } });
}

function initMobileBottomNav() {
  const searchInput = document.getElementById('search-input');
  const modal = document.getElementById('contact-modal');
  document.querySelectorAll('[data-mobile-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.mobileAction;
      document.querySelectorAll('.bottom-nav-item').forEach((item) => item.classList.toggle('active', item === button));
      if (action === 'home') {
        resetAllFilters();
        closeDrawer();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (action === 'categories') {
        openDrawer();
      }
      if (action === 'search') {
        closeDrawer();
        searchInput.focus({ preventScroll: true });
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (action === 'contact') {
        closeDrawer();
        modal.hidden = false;
      }
    });
  });
}

// 旗舰物理鼠标跟随与卡片探照灯微倾动效引擎（桌面精细指针启用，静止停帧零占用）
function initMotionEffects() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('ailxw-motion-ready');

  const glow = document.createElement('div');
  glow.className = 'ailxw-cursor-glow';
  glow.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.className = 'ailxw-cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  document.body.appendChild(glow);
  document.body.appendChild(ring);

  const SPOT_SEL = '.tool-card, .portal-hero, .sidebar-status';
  const TILT_SEL = '.portal-hero, .tool-card';
  const MAG_SEL = '.hero-btn-primary, .contact-top-btn, .quick-shop';

  let tx = -999, ty = -999, cx = -999, cy = -999, rx = -999, ry = -999;
  let visible = false, rafId = 0;
  let activeSpot = null, activeTilt = null, activeMag = null;

  function renderFrame() {
    rafId = 0;
    if (!visible) return;
    cx += (tx - cx) * 0.13;
    cy += (ty - cy) * 0.13;
    rx += (tx - rx) * 0.28;
    ry += (ty - ry) * 0.28;
    glow.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    if (Math.abs(tx - cx) > 0.35 || Math.abs(ty - cy) > 0.35) {
      rafId = window.requestAnimationFrame(renderFrame);
    }
  }

  function clearSpot() {
    if (activeSpot) {
      activeSpot.removeAttribute('data-spot');
      activeSpot = null;
    }
  }

  function clearTilt() {
    if (activeTilt) {
      activeTilt.removeAttribute('data-tilting');
      activeTilt.style.setProperty('--rx', '0deg');
      activeTilt.style.setProperty('--ry', '0deg');
      activeTilt = null;
    }
  }

  function clearMag() {
    if (activeMag) {
      activeMag.style.setProperty('--mag-x', '0px');
      activeMag.style.setProperty('--mag-y', '0px');
      activeMag = null;
    }
  }

  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const x = ev.clientX, y = ev.clientY;
    if (!visible) {
      cx = rx = x;
      cy = ry = y;
      visible = true;
      glow.classList.add('on');
      ring.classList.add('on');
    }
    tx = x;
    ty = y;
    if (!rafId) rafId = window.requestAnimationFrame(renderFrame);

    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) return;

    ring.classList.toggle('hover', Boolean(target.closest('a, button, input')));

    const spotEl = target.closest(SPOT_SEL);
    if (spotEl !== activeSpot) {
      clearSpot();
      activeSpot = spotEl;
    }
    if (activeSpot) {
      const rect = activeSpot.getBoundingClientRect();
      activeSpot.style.setProperty('--mx', `${(x - rect.left).toFixed(1)}px`);
      activeSpot.style.setProperty('--my', `${(y - rect.top).toFixed(1)}px`);
      activeSpot.setAttribute('data-spot', '1');
    }

    const tiltEl = target.closest(TILT_SEL);
    if (tiltEl !== activeTilt) {
      clearTilt();
      activeTilt = tiltEl;
    }
    if (activeTilt) {
      const rect = activeTilt.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        const nx = (x - rect.left) / rect.width - 0.5;
        const ny = (y - rect.top) / rect.height - 0.5;
        const maxDeg = activeTilt.classList.contains('portal-hero') ? 2.2 : 3.0;
        activeTilt.style.setProperty('--rx', `${(-ny * maxDeg * 2).toFixed(2)}deg`);
        activeTilt.style.setProperty('--ry', `${(nx * maxDeg * 2).toFixed(2)}deg`);
        activeTilt.setAttribute('data-tilting', '1');
      }
    }

    const magEl = target.closest(MAG_SEL);
    if (magEl !== activeMag) {
      clearMag();
      activeMag = magEl;
    }
    if (activeMag) {
      const rect = activeMag.getBoundingClientRect();
      const ox = ((x - rect.left) / rect.width - 0.5) * 6;
      const oy = ((y - rect.top) / rect.height - 0.5) * 4;
      activeMag.style.setProperty('--mag-x', `${ox.toFixed(1)}px`);
      activeMag.style.setProperty('--mag-y', `${oy.toFixed(1)}px`);
    }
  }, { passive: true });

  window.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse') ring.classList.add('down');
  }, { passive: true });

  window.addEventListener('pointerup', () => {
    ring.classList.remove('down');
  }, { passive: true });

  const resetAll = () => {
    visible = false;
    glow.classList.remove('on');
    ring.classList.remove('on', 'hover', 'down');
    clearSpot();
    clearTilt();
    clearMag();
  };
  document.addEventListener('mouseleave', resetAll);
  window.addEventListener('blur', resetAll);
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
    if (!res.ok) throw new Error('接口暂不可用');
    const result = await res.json();
    if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error('数据库为空');
    }
    return { data: result.data, contact: result.contact, site: result.site };
  } catch {
    const data = await fetch('data.json' + query, { cache: 'no-store' }).then((r) => r.json());
    if (!Array.isArray(data)) throw new Error('备用导航格式无效');
    return { data, contact: defaultContact(), site: null, fallback: true };
  }
}

async function applyNavPayload(payload) {
  navData = payload.data;
  contact = normalizeContact(payload.contact);
  if (payload.site) applySiteConfig(payload.site);
  renderSidebar();
  renderCategoryFilters();
  const status = document.getElementById('load-status');
  status.hidden = !payload.fallback;
  status.textContent = payload.fallback ? '当前展示内置导航清单，实时配置暂不可用。' : '';
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
    initScrollSpy();
    initMotionEffects();
    setupLiveSync();
  }
}

function setupLiveSync() {
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
    } catch {
      /* 忽略 */
    }
  }

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

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        const payload = await fetchNavConfig();
        await applyNavPayload(payload);
      } catch {
        /* 容错 */
      }
    }
  });
}

fetchNavConfig()
  .then(applyNavPayload)
  .catch((err) => {
    console.error('加载配置失败:', err);
    const status = document.getElementById('load-status');
    status.hidden = false;
    status.textContent = '导航暂时加载失败，请刷新重试。也可直接访问 shop.ailxw.com 智能商城。';
  });

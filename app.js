let navData = [];

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
    <a href="#cat-${cat.id}" class="nav-item">
      ${ICONS[cat.icon] || ''}
      <span>${cat.name}</span>
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
          <div class="tool-avatar" style="background: ${item.color || '#6366f1'}">
            ${item.name.charAt(0)}
          </div>
          <div class="tool-info">
            <div class="tool-name-row">
              <span class="tool-name">${item.name}</span>
              ${item.badge ? `<span class="tool-badge">${item.badge}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="tool-desc">${item.desc}</div>
        <div class="tool-footer">
          <div class="tag-list">
            ${(item.tags || []).map(tag => `<span class="tag-item">${tag}</span>`).join('')}
          </div>
          <svg class="link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
        </div>
      </a>
    `).join('');

    return `
      <section id="cat-${cat.id}" class="category-section">
        <div class="category-header">
          ${ICONS[cat.icon] || ''}
          <h2 class="category-title">${cat.name}</h2>
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
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// 启动
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    navData = data;
    renderSidebar();
    renderContent();
    initTheme();
    initSearch();
    initMobileMenu();
  })
  .catch(err => {
    console.error('加载配置失败:', err);
  });

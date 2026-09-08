let navData = [];
let selectedCategoryId = "";

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
function status(message, error = false) { const node = $(document.body.contains($('login-panel')) && !$('login-panel').classList.contains('hidden') ? 'login-status' : 'admin-status'); node.textContent = message; node.className = `status ${error ? 'error' : 'ok'}`; }
function selectedCategory() { return navData.find((category) => category.id === selectedCategoryId); }
function renderCategories() {
  $('category-list').innerHTML = navData.length ? navData.map((category) => `<div class="category ${category.id === selectedCategoryId ? 'active' : ''}" data-id="${escapeHtml(category.id)}"><span>${escapeHtml(category.name)}</span><small>${category.items.length}</small></div>`).join('') : '<div class="empty">还没有分类</div>';
  document.querySelectorAll('.category').forEach((node) => node.addEventListener('click', () => { selectedCategoryId = node.dataset.id; $('category-name').value = selectedCategory()?.name || ''; renderCategories(); renderItems(); }));
}
function renderItems() {
  const category = selectedCategory();
  $('selected-category').textContent = category ? `当前分类：${category.name}` : '请选择一个分类';
  $('item-list').innerHTML = category?.items.length ? category.items.map((item, index) => `<div class="item"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.url)}</span><span>${escapeHtml(item.desc || '暂无描述')}</span></div><div class="item-actions"><button data-edit="${index}">编辑</button><button class="danger" data-delete="${index}">删除</button></div></div>`).join('') : '<div class="empty">当前分类还没有网站</div>';
  document.querySelectorAll('[data-edit]').forEach((node) => node.addEventListener('click', () => fillItem(category.items[Number(node.dataset.edit)])));
  document.querySelectorAll('[data-delete]').forEach((node) => node.addEventListener('click', () => { if (!confirm('确定删除这个网站吗？')) return; category.items.splice(Number(node.dataset.delete), 1); renderCategories(); renderItems(); }));
}
function fillItem(item) { $('item-id').value = item.id || ''; $('item-name').value = item.name || ''; $('item-url').value = item.url || ''; $('item-desc').value = item.desc || ''; $('item-tags').value = (item.tags || []).join(', '); $('item-badge').value = item.badge || ''; $('item-color').value = item.color || '#6366f1'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function clearItem() { ['item-id','item-name','item-url','item-desc','item-tags','item-badge'].forEach((id) => $(id).value = ''); $('item-color').value = '#6366f1'; }
function render() { renderCategories(); renderItems(); }
async function api(url, options = {}) { const response = await fetch(url, { headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || '请求失败'); return data; }
async function load() {
  try {
    const result = await api('/api/admin/nav'); navData = result.data || [];
    if (!navData.length) { const legacy = await fetch('/data.json').then((response) => response.json()); navData = legacy; status('数据库为空，已载入现有 data.json，请点击“保存全部修改”完成导入。'); }
    selectedCategoryId = navData[0]?.id || ''; $('category-name').value = selectedCategory()?.name || ''; render();
  } catch (error) { if (error.message.includes('登录')) { $('admin-panel').classList.add('hidden'); $('login-panel').classList.remove('hidden'); } status(error.message, true); }
}
$('login-form').addEventListener('submit', async (event) => { event.preventDefault(); try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: $('username').value, password: $('password').value }) }); $('login-panel').classList.add('hidden'); $('admin-panel').classList.remove('hidden'); await load(); } catch (error) { $('login-status').textContent = error.message; $('login-status').className = 'status error'; } });
$('logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); location.reload(); });
$('add-category').addEventListener('click', () => { const name = $('category-name').value.trim(); if (!name) return status('请先填写分类名称', true); const id = `cat-${crypto.randomUUID()}`; navData.push({ id, name, icon: 'Sparkles', items: [] }); selectedCategoryId = id; render(); status('分类已添加，请点击保存全部修改。'); });
$('rename-category').addEventListener('click', () => { const category = selectedCategory(); const name = $('category-name').value.trim(); if (!category || !name) return status('请选择分类并填写名称', true); category.name = name; render(); status('分类名称已修改，请点击保存全部修改。'); });
$('delete-category').addEventListener('click', () => { if (!selectedCategory()) return status('请先选择分类', true); if (!confirm('删除分类会同时删除其中的网站，确定继续吗？')) return; navData = navData.filter((category) => category.id !== selectedCategoryId); selectedCategoryId = navData[0]?.id || ''; $('category-name').value = selectedCategory()?.name || ''; render(); status('分类已删除，请点击保存全部修改。'); });
$('item-form').addEventListener('submit', (event) => { event.preventDefault(); const category = selectedCategory(); if (!category) return status('请先选择分类', true); const item = { id: $('item-id').value || crypto.randomUUID(), name: $('item-name').value.trim(), url: $('item-url').value.trim(), desc: $('item-desc').value.trim(), tags: $('item-tags').value.split(',').map((tag) => tag.trim()).filter(Boolean), badge: $('item-badge').value.trim(), color: $('item-color').value }; if (!item.name || !item.url) return status('网站名称和链接不能为空', true); const index = category.items.findIndex((current) => current.id === item.id); if (index >= 0) category.items[index] = item; else category.items.push(item); clearItem(); render(); status('网站已修改，请点击保存全部修改。'); });
$('clear-item').addEventListener('click', clearItem);
$('save-all').addEventListener('click', async () => { try { $('save-all').disabled = true; const result = await api('/api/admin/nav', { method: 'PUT', body: JSON.stringify({ data: navData }) }); navData = result.data || navData; render(); status('已保存到 Cloudflare D1。'); } catch (error) { status(error.message, true); } finally { $('save-all').disabled = false; } });

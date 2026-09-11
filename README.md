# 🌐 isoziyuan-nav (爱搜资源 · 服务导航站)

[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-f38020?logo=cloudflare&logoColor=white)](https://ailxw.com)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1-184D66?logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个高颜值、极速、基于 **Cloudflare Pages + D1 Serverless** 架构构建的个人微服务/AI应用聚合导航站。

- 🚀 **在线访问**：[https://ailxw.com](https://ailxw.com)
- 备用访问：[https://isoziyuan-nav.pages.dev](https://isoziyuan-nav.pages.dev)
- 源码仓库：[yys9253462-gif/isoziyuan-nav](https://github.com/yys9253462-gif/isoziyuan-nav)

---

## ⚡ 一键全自动搭建（小白推荐）

不想跟着教程一步步点？下载仓库里的 **`一键搭建导航站.bat`**，双击运行即可：

- 自动检测并安装 Git / Node.js / GitHub CLI（经 winget）
- 自动完成 GitHub 授权 + Fork 仓库 + 克隆到本地
- 自动完成 Cloudflare 授权（浏览器点一次 Allow）
- 自动创建 D1 数据库 + 初始化表结构 + 校准绑定
- 自动创建 Pages 项目 + 加密写入后台密码 + 部署上线
- 结束后显示你的导航站地址、后台地址与管理员密码

> 全程只需在浏览器里点 2 次授权，其余全自动。要求 Windows 10/11。

## 🌟 核心特性

- ⚡ **全球边缘极速访问**：基于 Cloudflare 边缘计算全球 CDN，静态页面由 Pages 直接分发，首屏响应毫秒级。
- 🎨 **现代化 UI & 极客动效**：
  - 采用深浅色自适应（支持手动切换 Dark / Light 主题）；
  - 拟态玻璃质感面板、精致流光高亮与平滑过渡；
  - 快速全局搜索（按键盘 `/` 键即时聚焦），支持按名称、描述与特性标签全匹配。
- 🛡️ **双引擎数据架构（无缝兼容）**：
  - **静态兜底**：根目录 `data.json` 支持免数据库独立静态部署；
  - **动态管理**：通过 Cloudflare D1 关系型数据库与 Edge Functions，支持带密码鉴权的独立可视化后台（`/admin`）。
- ⚙️ **一键全自动发布**：配套 Windows 本地一键批处理脚本，双击自动 `git push` 并一键直推 Cloudflare 生产环境。

---

## 📂 项目结构

```text
├── index.html                  # 导航站前台首页
├── style.css                   # 前台样式（含主题变量、响应式栅格）
├── app.js                      # 前台核心逻辑（数据渲染、动态搜索、主题切换）
├── data.json                   # 本地静态站点配置数据（免 D1 模式兜底）
├── admin.html / admin.js / .css # 后台管理页面（可视化增删改查、排序、分类管理）
├── functions/                  # Cloudflare Pages Edge Functions 接口
│   └── api/                    # 动态 RESTful 接口（登录、鉴权、读写 D1 数据库）
├── schema.sql                  # D1 数据库建表语句
├── wrangler.jsonc              # Cloudflare Wrangler 配置文件
├── 一键发布到Cloudflare.bat     # Windows 本地一键 Git 提交 + 自动部署生产脚本
└── README.md                   # 项目说明文档
```

---

## 🛠️ 快速开始

### 方式 1：纯静态极简部署（仅需 GitHub / Pages）
1. Fork 或 Clone 本仓库；
2. 在 `data.json` 中添加或修改你的站点信息；
3. 将项目托管至 Cloudflare Pages 或任何静态托管平台（如 Vercel、GitHub Pages）即可直接使用。

### 方式 2：全功能 D1 动态后台部署（推荐）

1. **安装并登录 Wrangler**（如已配置可跳过）：
   ```bash
   npm install -g wrangler
   npx wrangler login
   ```

2. **创建 Cloudflare D1 数据库**：
   在命令行中执行：
   ```bash
   npx wrangler d1 create isoziyuan-nav-db
   ```
   复制终端返回的 `database_id`，填入 `wrangler.jsonc` 的 `database_id` 字段中。

3. **初始化数据库表结构**：
   ```bash
   npx wrangler d1 execute isoziyuan-nav-db --remote --file schema.sql
   ```

4. **配置后台环境变量（Secrets）**：
   进入 Cloudflare Dashboard → **Workers & Pages** → 你的 Pages 项目 → **Settings** → **Environment variables**：
   - `ADMIN_PASSWORD`：后台管理员密码（**必填**，用于登录 `/admin`）
   - `ADMIN_USERNAME`：管理员用户名（可选，默认为 `admin`）

5. **绑定 D1 数据库**：
   进入 Pages 项目的 **Settings** → **Functions** → **D1 database bindings**：
   - Binding 变量名填入：`NAV_DB`
   - 选择上面创建的 D1 数据库 `isoziyuan-nav-db`。

6. **登录后台**：
   访问 `https://你的域名/admin`，输入密码即可可视化新增、编辑、拖拽排序站点。初次登录会自动导入 `data.json` 初始数据。

---

## 🚀 一键全自动发布（Windows 本地脚本）

本项目内置了专为 Windows 用户定制的 `一键发布到Cloudflare.bat`：

- **自动化功能**：
  1. 自动比对本地代码是否有变更；
  2. 自动添加 Git 暂存区、携带精确时间戳 commit 并一键免密推送到 GitHub `main` 分支；
  3. 自动调用 Wrangler 极速同步部署至 Cloudflare Pages，全球 CDN 实时刷新生效（全程耗时仅 2~3 秒）。
- **使用方式**：
  本地修改任何配置后，**直接双击运行 `一键发布到Cloudflare.bat`** 即可，全流程无需输入命令行！

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 协议开源。
欢迎 Star ⭐️ 与 Fork 打造属于你自己的个人服务导航聚合站！

# 导航后台部署说明

本项目现在支持 Cloudflare Pages Functions + D1 后台管理。首页继续兼容原来的 `data.json`，数据库配置完成后会自动优先读取 D1。

## 1. 创建 D1 数据库

在 Cloudflare 控制台进入 **Workers & Pages → D1 SQL database**，创建数据库，例如：

`isoziyuan-nav-db`

然后在 D1 的 Console 中执行项目根目录的 `schema.sql`。

## 2. 绑定 Pages 项目

进入 **Workers & Pages → 你的 Pages 项目 → Settings → Functions → Bindings**：

- 添加 D1 database binding
- Variable name 填：`NAV_DB`
- 选择刚才创建的数据库

## 3. 配置后台密码

在 Pages 项目的 **Settings → Environment variables → Production** 添加 Secrets：

- `ADMIN_PASSWORD`：后台密码，必须设置
- `ADMIN_USERNAME`：管理员账号，可选，默认是 `admin`

不要把密码写进 GitHub 代码或 `data.json`。

## 4. 部署并访问

提交并推送代码后，Cloudflare Pages 会自动部署。部署完成后访问：

`https://你的域名/admin`

第一次登录后，如果数据库为空，后台会自动载入旧的 `data.json`，点击“保存全部修改”即可完成导入。

## 后台功能

- 分类新增、重命名、删除
- 网站新增、编辑、删除
- 网站名称、链接、描述、标签、徽标、颜色管理
- 保存后首页自动读取最新数据
- 未绑定 D1 时首页仍使用原来的静态数据

## 本地命令（可选）

如果使用 Wrangler，也可以执行：

```bash
npx wrangler d1 execute isoziyuan-nav-db --remote --file schema.sql
```

Pages Functions 只处理 `/api/*`，静态页面由 Pages 直接提供，避免普通访问消耗后台函数额度。

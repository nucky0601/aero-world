# 免费公网部署说明

## 一体化部署

这个项目现在可以作为一个 Node Web 服务部署：

- 网页静态文件由 `dist/` 提供
- 多人和聊天 WebSocket 使用同域名的 `/ws`
- 邮箱注册、登录和会话接口使用同域名的 `/api/*`
- 管理后台使用同域名的 `/admin`
- 平台只需要开放一个端口，由环境变量 `PORT` 指定

部署命令：

```bash
npm install
npm run build
npm start
```

## 免费正式方案：Render + Neon

推荐组合：

- Render Free Web Service：运行 Node 游戏服务器、静态网页和 WebSocket。
- Neon Free Postgres：保存账号、密码哈希和登录会话，支持不同设备登录同一个账号。

仓库里已经包含 `render.yaml`。连接 Git 仓库后，Render 会使用：

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: `DATABASE_URL`

部署步骤：

1. 把本项目推到 GitHub 仓库。
2. 在 Neon 创建免费 Postgres 项目，复制连接字符串。
3. 在 Render 新建 Web Service，选择这个 GitHub 仓库。
4. 在 Render 的环境变量里添加 `DATABASE_URL`，值填 Neon 的连接字符串。
5. 在 Render 的环境变量里添加 `ADMIN_EMAILS`，值填你的管理员邮箱。多个管理员用英文逗号分隔。
6. 部署完成后，访问 Render 给出的 HTTPS 地址。前端会自动连接同域名的 `wss://你的域名/ws`，账号接口也会走同域名 `/api/*`。

`.env.example` 里有需要配置的变量名示例。

## 管理后台

管理链接是：

```text
https://你的域名/admin
```

管理员账号不是单独的一套账号系统，而是普通邮箱账号加管理员权限：

1. 先在游戏首页用你的邮箱注册账号。
2. 在服务器环境变量里设置 `ADMIN_EMAILS=你的邮箱`。
3. 重启或重新部署服务器。
4. 访问 `/admin`，用同一个邮箱登录。

当前后台包含：

- 发布公告：玩家进入游戏后会看到最新公告。
- 举报处理：玩家可在聊天历史里举报消息，管理员可标记已处理或重新打开。
- 聊天历史：管理员可查看最近聊天，用于处理举报和社区管理。

后续正式运营通常还会继续增加：禁言、封号、玩家资料查询、管理员操作日志、权限分级、内容敏感词、客服工单和数据备份。

## 本地测试账号系统

本地没有 `DATABASE_URL` 时，服务器会把账号保存到 `data/accounts.json`：

```bash
npm run build
npm start
```

然后访问 `http://127.0.0.1:8080`。

注意：这个 JSON 存储只适合本地开发。免费云平台的文件系统通常不是可靠持久数据库，如果要“记住注册信息并且多平台登录”，正式部署必须配置 `DATABASE_URL`。

## 其他平台

Railway、Fly.io、VPS、阿里云/腾讯云轻量服务器都可以使用同样的三条命令。只要平台提供 `PORT` 环境变量，服务就会自动监听该端口。

## 本地公网隧道

如果只是临时给朋友测试，可以用 Cloudflare Tunnel、ngrok 或 localtunnel 暴露本机 `8080` 端口。长期运行建议使用正式服务器。

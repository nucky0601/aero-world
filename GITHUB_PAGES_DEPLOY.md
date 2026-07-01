# Aero World：GitHub Pages 免费部署流程

这条路线不需要 Vercel，不需要信用卡，也不需要新平台注册。网页放在 GitHub Pages，账号、聊天、公告、举报仍然使用 Supabase。

## 1. 当前要用的链接

Supabase 项目地址：

```text
https://ywqyqiwgcwknhtnkamjz.supabase.co
```

GitHub Pages 部署成功后的游戏链接通常是：

```text
https://nucky0601.github.io/aero-world/
```

管理后台链接：

```text
https://nucky0601.github.io/aero-world/#admin
```

## 2. 在 GitHub 仓库添加 Secrets

进入仓库：

```text
https://github.com/nucky0601/aero-world
```

然后打开：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

添加三条：

```text
VITE_SUPABASE_URL
```

值填：

```text
https://ywqyqiwgcwknhtnkamjz.supabase.co
```

再添加：

```text
VITE_SUPABASE_ANON_KEY
```

值填 Supabase 的：

```text
anon public key / publishable key
```

再添加：

```text
VITE_ADMIN_EMAILS
```

值填你的管理员邮箱。

注意：不要填 `service_role`、`secret`、数据库密码、JWT secret。

## 3. 开启 GitHub Pages

进入：

```text
Settings -> Pages
```

在 `Build and deployment` 里：

```text
Source: GitHub Actions
```

保存。

## 4. 推送代码后自动部署

代码推到 `main` 后，GitHub 会自动运行：

```text
Actions -> Deploy GitHub Pages
```

看到绿色对勾后，打开：

```text
https://nucky0601.github.io/aero-world/
```

## 5. 如果页面能打开但不能注册

检查：

- `VITE_SUPABASE_URL` 是否是 `https://ywqyqiwgcwknhtnkamjz.supabase.co`，不要带 `/rest/v1/`。
- `VITE_SUPABASE_ANON_KEY` 是否填的是 `anon public key / publishable key`。
- Supabase 是否已经关闭邮箱确认。
- GitHub Secrets 改完后，需要重新运行 Actions 或重新推送一次代码。


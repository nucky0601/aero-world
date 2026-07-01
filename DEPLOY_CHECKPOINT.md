# Aero World 部署检查点

更新时间：2026-07-01

## 已完成

- 游戏项目代码已准备好，并已通过 GitHub Desktop 提交/发布到 `nucky0601/aero-world`。
- Supabase 项目已创建，项目名是 `aero-world`。
- Supabase 建表 SQL 已运行成功。
- 管理员邮箱 SQL 已运行成功。
- Supabase 已关闭邮箱确认，玩家注册后应可直接登录。
- 当前部署路线：不用信用卡，使用 `Vercel + Supabase`。

## 当前停在这里

Vercel 账号登录触发了额外验证，当前改用 GitHub Pages 免费部署路线。

你之前在 Supabase 的：

```text
Integrations -> Data API
```

截图里看到的 API URL 是：

```text
https://ywqyqiwgcwknhtnkamjz.supabase.co/rest/v1/
```

Vercel 里真正要填的 `VITE_SUPABASE_URL` 不是这一整串，而是去掉 `/rest/v1/` 后的项目地址：

```text
https://ywqyqiwgcwknhtnkamjz.supabase.co
```

## 继续时要做什么

### 1. 在 Supabase 找 key

在 Supabase 左侧进入：

```text
Project Settings -> API
```

或者新版界面可能在：

```text
Project Settings -> API Keys
```

需要复制的是：

```text
Project URL
anon public key / publishable key
```

不要复制：

```text
service_role
secret
JWT secret
database password
```

这些不能放到网页里，也不要发给任何人。

### 2. 在 GitHub 仓库添加 Secrets

进入：

```text
https://github.com/nucky0601/aero-world
```

然后：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

添加三行：

```text
VITE_SUPABASE_URL        https://ywqyqiwgcwknhtnkamjz.supabase.co
VITE_SUPABASE_ANON_KEY   Supabase 的 anon public key / publishable key
VITE_ADMIN_EMAILS        你的管理员邮箱
```

### 3. 开启 GitHub Pages

进入仓库：

```text
Settings -> Pages
```

把：

```text
Source
```

设置成：

```text
GitHub Actions
```

保存后，推送代码到 `main` 会自动部署。

### 4. 部署后的链接

游戏地址通常是：

```text
https://nucky0601.github.io/aero-world/
```

管理后台：

```text
https://nucky0601.github.io/aero-world/#admin
```

详细流程见：

```text
GITHUB_PAGES_DEPLOY.md
```

## 已新增的部署文件

```text
.github/workflows/deploy-pages.yml
vite.config.ts
public/404.html
GITHUB_PAGES_DEPLOY.md
```

## 部署后测试

- 打开 Vercel 给出的游戏链接。
- 手机端注册一个新账号。
- 登录后发聊天，确认画面不会因为输入法缩小。
- 电脑和手机同时打开同一个链接，确认聊天和玩家同步。
- 用管理员邮箱登录后打开：

```text
/admin
```

检查公告、举报、聊天历史管理。

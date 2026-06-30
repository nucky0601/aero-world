# 无信用卡部署：Vercel + Supabase

这条路线不使用 Render，不需要 Node 服务器，也不需要绑定信用卡。

- Vercel：部署网页游戏静态文件。
- Supabase：负责邮箱注册登录、数据库、聊天历史、公告、举报、多人在线同步。

## 1. 先把代码推到 GitHub

你已经有仓库：

```text
https://github.com/nucky0601/aero-world
```

修改代码后，用 GitHub Desktop：

1. 打开 GitHub Desktop。
2. 选择本地项目 `D:\codex projects\game test`。
3. 左下角 Summary 填：`mobile controls and supabase deploy`
4. 点 `Commit to main`。
5. 点 `Push origin`。

## 2. 创建 Supabase 项目

1. 打开 Supabase。
2. 点 `New project`。
3. Project name 填：`aero-world`
4. Database password 自己保存好。
5. Region 选离你近的即可。
6. 点创建。

## 3. 执行数据库脚本

1. 进入 Supabase 项目。
2. 左侧点 `SQL Editor`。
3. 点 `New query`。
4. 打开项目文件 `supabase/schema.sql`。
5. 复制全部内容，粘贴到 SQL Editor。
6. 点 `Run`。

然后再单独运行一行管理员邮箱：

```sql
insert into public.admin_emails (email)
values ('你的管理员邮箱@example.com')
on conflict do nothing;
```

把里面的邮箱改成你的真实管理员邮箱。这个邮箱也要填到 Vercel 的 `VITE_ADMIN_EMAILS`。

## 4. Supabase Auth 设置

为了测试方便，建议先关闭邮箱确认：

1. 左侧点 `Authentication`。
2. 点 `Providers`。
3. 找到 `Email`。
4. 关闭 `Confirm email` 或类似“邮箱确认”的开关。
5. 保存。

如果你不关闭，玩家注册后必须先去邮箱点确认链接，才能登录。

## 5. 复制 Supabase 前端密钥

1. 左侧点 `Project Settings`。
2. 点 `API`。
3. 复制：
   - `Project URL`
   - `anon public key`

注意：只复制 `anon public key`，不要复制 `service_role`。

## 6. 创建 Vercel 项目

1. 打开 Vercel。
2. 用 GitHub 登录。
3. 点 `Add New...`。
4. 选 `Project`。
5. 找到 `nucky0601/aero-world`。
6. 点 `Import`。

配置：

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Root Directory 留空。

## 7. Vercel 环境变量

在 Vercel 的 `Environment Variables` 添加三行：

```text
VITE_SUPABASE_URL        Supabase 的 Project URL
VITE_SUPABASE_ANON_KEY   Supabase 的 anon public key
VITE_ADMIN_EMAILS        你的管理员邮箱
```

示例：

```text
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_ADMIN_EMAILS=your@email.com
```

## 8. 部署

1. 点 `Deploy`。
2. 等构建完成。
3. Vercel 会给你一个链接，类似：

```text
https://aero-world.vercel.app
```

游戏地址：

```text
https://aero-world.vercel.app
```

管理后台：

```text
https://aero-world.vercel.app/admin
```

## 9. 测试清单

1. 手机打开 Vercel 链接。
2. 注册邮箱账号。
3. 进入游戏后点右下角“聊天”。
4. 发送聊天，确认地图不会缩小。
5. 另一台设备登录同一个账号，确认账号可复用。
6. 打开 `/admin`，用管理员邮箱登录。
7. 发布公告，回到游戏首页检查公告是否显示。
8. 在聊天历史里提交举报，再到后台检查举报。

## 常见问题

### 注册后提示要确认邮件

去 Supabase `Authentication -> Providers -> Email` 关闭邮箱确认，或去邮箱点击确认链接。

### 管理后台提示不是管理员

检查两处邮箱是否完全一致：

- Vercel 环境变量 `VITE_ADMIN_EMAILS`
- Supabase 表 `admin_emails`

### 多人或聊天不动

确认 Vercel 环境变量已经填好，并重新部署。Vite 的 `VITE_` 变量是在构建时写入的，改完变量必须 redeploy。

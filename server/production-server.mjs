import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import {
  createAccountStore,
  createSessionExpiry,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./account-store.mjs";

const PORT = Number(process.env.PORT ?? 8080);
const ROOT = join(fileURLToPath(new URL("..", import.meta.url)), "dist");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const accountStore = await createAccountStore();
const clients = new Map();
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") {
      pathname = "/index.html";
    }

    const requestedPath = normalize(join(ROOT, pathname));
    const filePath = requestedPath.startsWith(ROOT) && existsSync(requestedPath) ? requestedPath : join(ROOT, "index.html");
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable"
    });
    res.end(body);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      const statusCode = error?.statusCode === 413 ? 413 : 500;
      const message = statusCode === 413 ? "请求内容太大。" : "服务器暂时不可用";
      if (req.url?.startsWith("/api/")) {
        sendJson(res, statusCode, { message });
      } else {
        res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(message);
      }
    }
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    });
    res.end();
    return;
  }

  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, accountStorage: accountStore.kind, adminConfigured: ADMIN_EMAILS.size > 0 });
    return;
  }

  if (url.pathname === "/api/register" && req.method === "POST") {
    const body = await readJsonBody(req);
    const email = normalizeEmail(body.email);
    const username = normalizeUsername(body.username);
    const password = String(body.password ?? "");

    if (!isValidEmail(email) || username.length < 2 || password.length < 6 || password.length > 128) {
      sendJson(res, 400, { message: "请填写有效邮箱、2-16 位用户名和至少 6 位密码。" });
      return;
    }

    try {
      const passwordRecord = await hashPassword(password);
      const account = await accountStore.createAccount({ email, username, ...passwordRecord });
      const session = await createStoredSession(account.id);
      sendJson(res, 201, {
        profile: publicProfile(account),
        sessionToken: session.sessionToken
      });
    } catch (error) {
      if (error?.code === "EMAIL_EXISTS") {
        sendJson(res, 409, { message: "这个邮箱已经注册过，请直接登录。" });
        return;
      }
      throw error;
    }
    return;
  }

  if (url.pathname === "/api/login" && req.method === "POST") {
    const body = await readJsonBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    const account = isValidEmail(email) ? await accountStore.findAccountByEmail(email) : null;

    if (!account || !(await verifyPassword(password, account))) {
      sendJson(res, 401, { message: "邮箱或密码不正确。" });
      return;
    }

    const session = await createStoredSession(account.id);
    sendJson(res, 200, {
      profile: publicProfile(account),
      sessionToken: session.sessionToken
    });
    return;
  }

  if (url.pathname === "/api/me" && req.method === "GET") {
    const profile = await getProfileFromRequest(req);
    if (!profile) {
      sendJson(res, 401, { message: "登录已过期，请重新登录。" });
      return;
    }

    sendJson(res, 200, { profile: addRole(profile) });
    return;
  }

  if (url.pathname === "/api/logout" && req.method === "POST") {
    const token = getBearerToken(req);
    if (token) {
      await accountStore.deleteSession(hashSessionToken(token));
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/announcements" && req.method === "GET") {
    sendJson(res, 200, { announcements: await accountStore.listAnnouncements(5) });
    return;
  }

  if (url.pathname === "/api/chat/history" && req.method === "GET") {
    const profile = await requireProfile(req, res);
    if (!profile) {
      return;
    }
    const limit = clampNumber(url.searchParams.get("limit"), 20, 120, 80);
    sendJson(res, 200, { messages: await accountStore.listChatMessages(limit) });
    return;
  }

  if (url.pathname === "/api/reports" && req.method === "POST") {
    const profile = await requireProfile(req, res);
    if (!profile) {
      return;
    }
    const body = await readJsonBody(req);
    const targetUsername = safeText(body.targetUsername, 24) || "未知玩家";
    const reason = safeText(body.reason, 220);
    if (reason.length < 4) {
      sendJson(res, 400, { message: "请写清楚举报原因，至少 4 个字符。" });
      return;
    }
    const report = await accountStore.addReport({
      reporterId: profile.id,
      reporterUsername: profile.username,
      targetUsername,
      reason
    });
    sendJson(res, 201, { report });
    return;
  }

  if (url.pathname === "/api/admin/overview" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) {
      return;
    }
    sendJson(res, 200, {
      profile: addRole(admin),
      onlinePlayers: clients.size,
      announcements: await accountStore.listAnnouncements(20),
      reports: await accountStore.listReports(120),
      messages: await accountStore.listChatMessages(120)
    });
    return;
  }

  if (url.pathname === "/api/admin/announcements" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) {
      return;
    }
    const body = await readJsonBody(req);
    const title = safeText(body.title, 40);
    const announcementBody = safeText(body.body, 300);
    if (title.length < 2 || announcementBody.length < 4) {
      sendJson(res, 400, { message: "公告标题至少 2 个字符，正文至少 4 个字符。" });
      return;
    }
    const announcement = await accountStore.addAnnouncement({
      title,
      body: announcementBody,
      createdBy: admin.email
    });
    sendJson(res, 201, { announcement });
    return;
  }

  if (url.pathname === "/api/admin/reports/update" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) {
      return;
    }
    const body = await readJsonBody(req);
    const id = safeText(body.id, 80);
    const status = body.status === "closed" ? "closed" : "open";
    const note = safeText(body.note, 180);
    const report = await accountStore.updateReport({ id, status, note });
    if (!report) {
      sendJson(res, 404, { message: "举报不存在。" });
      return;
    }
    sendJson(res, 200, { report });
    return;
  }

  sendJson(res, 404, { message: "接口不存在。" });
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12_000) {
      const error = new Error("REQUEST_TOO_LARGE");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(payload));
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeUsername(value) {
  return safeText(value, 16);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicProfile(account) {
  return {
    id: account.id,
    email: account.email,
    username: account.username
  };
}

async function createStoredSession(accountId) {
  const sessionToken = createSessionToken();
  await accountStore.createSession({
    accountId,
    tokenHash: hashSessionToken(sessionToken),
    expiresAt: createSessionExpiry()
  });
  return { sessionToken };
}

function getBearerToken(req) {
  const auth = req.headers.authorization ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

async function getProfileFromRequest(req) {
  const token = getBearerToken(req);
  return getProfileFromSessionToken(token);
}

async function getProfileFromSessionToken(token) {
  return token ? accountStore.findProfileBySession(hashSessionToken(token)) : null;
}

async function requireProfile(req, res) {
  const profile = await getProfileFromRequest(req);
  if (!profile) {
    sendJson(res, 401, { message: "请先登录。" });
    return null;
  }
  return profile;
}

async function requireAdmin(req, res) {
  const profile = await requireProfile(req, res);
  if (!profile) {
    return null;
  }
  if (!isAdminProfile(profile)) {
    sendJson(res, 403, { message: "当前账号不是管理员。请把该邮箱加入 ADMIN_EMAILS 后重新登录。" });
    return null;
  }
  return profile;
}

function isAdminProfile(profile) {
  return ADMIN_EMAILS.has(normalizeEmail(profile.email));
}

function addRole(profile) {
  return {
    ...profile,
    role: isAdminProfile(profile) ? "admin" : "player"
  };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function safeText(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function publicPlayer(player) {
  return {
    id: player.id,
    username: player.username,
    x: player.x,
    y: player.y
  };
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(message, exceptWs) {
  const payload = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws !== exceptWs && ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "join") {
      const verifiedProfile = await getProfileFromSessionToken(String(message.sessionToken ?? ""));
      const profile = verifiedProfile ?? message.profile ?? {};
      const player = {
        id: safeText(profile.id, 80) || randomUUID(),
        username: safeText(profile.username, 24) || "游客",
        email: safeText(profile.email, 120),
        x: Number(message.x) || 514,
        y: Number(message.y) || 364
      };
      clients.set(ws, player);
      send(ws, {
        type: "snapshot",
        players: [...clients.entries()].filter(([client]) => client !== ws).map(([, other]) => publicPlayer(other)),
        chatHistory: await accountStore.listChatMessages(60)
      });
      broadcast({ type: "playerJoined", player: publicPlayer(player) }, ws);
      return;
    }

    const player = clients.get(ws);
    if (!player) {
      return;
    }

    if (message.type === "move") {
      player.x = Number(message.x) || player.x;
      player.y = Number(message.y) || player.y;
      broadcast({ type: "playerMoved", id: player.id, x: player.x, y: player.y }, ws);
      return;
    }

    if (message.type === "chat") {
      const text = safeText(message.text, 80);
      if (text) {
        const chatMessage = await accountStore.addChatMessage({
          accountId: player.id,
          username: player.username,
          text
        });
        broadcast({ type: "chat", id: player.id, username: player.username, text, messageId: chatMessage.id, createdAt: chatMessage.createdAt }, undefined);
      }
    }
  });

  ws.on("close", () => {
    const player = clients.get(ws);
    if (!player) {
      return;
    }
    clients.delete(ws);
    broadcast({ type: "playerLeft", id: player.id }, ws);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`生产服务已启动：http://0.0.0.0:${PORT}`);
  console.log(`WebSocket 路径：/ws`);
});

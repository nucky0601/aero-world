import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.CHAT_PORT ?? 5175);
const wss = new WebSocketServer({ host: "0.0.0.0", port: PORT });
const clients = new Map();

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
  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "join") {
      const profile = message.profile ?? {};
      const id = safeText(profile.id, 80) || randomUUID();
      const username = safeText(profile.username, 24) || "游客";
      const email = safeText(profile.email, 120);
      const player = {
        id,
        username,
        email,
        x: Number(message.x) || 514,
        y: Number(message.y) || 364
      };
      clients.set(ws, player);
      send(ws, {
        type: "snapshot",
        players: [...clients.entries()].filter(([client]) => client !== ws).map(([, other]) => publicPlayer(other))
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
      if (!text) {
        return;
      }
      broadcast({ type: "chat", id: player.id, username: player.username, text }, undefined);
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

console.log(`聊天服务已启动：ws://0.0.0.0:${PORT}`);

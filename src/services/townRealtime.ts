import type { PlayerProfile } from "../ui/account";
import { getSupabase, isSupabaseEnabled } from "./supabase";

export interface TownPlayerSnapshot {
  id: string;
  username: string;
  x: number;
  y: number;
}

export interface TownRealtimeHandlers {
  onToast: (message: string) => void;
  onSnapshot: (players: TownPlayerSnapshot[]) => void;
  onPlayerJoined: (player: TownPlayerSnapshot) => void;
  onPlayerMoved: (id: string, x: number, y: number) => void;
  onPlayerLeft: (id: string) => void;
  onChat: (id: string, username: string, text: string) => void;
}

export interface TownRealtimeConnection {
  sendMove: (x: number, y: number) => void;
  sendChat: (text: string) => void;
  close: () => void;
  isConnected: () => boolean;
}

export function connectTownRealtime(profile: PlayerProfile, sessionToken: string, x: number, y: number, handlers: TownRealtimeHandlers): TownRealtimeConnection {
  if (isSupabaseEnabled()) {
    return connectSupabaseRealtime(profile, x, y, handlers);
  }
  return connectWebSocketRealtime(profile, sessionToken, x, y, handlers);
}

function connectWebSocketRealtime(profile: PlayerProfile, sessionToken: string, x: number, y: number, handlers: TownRealtimeHandlers): TownRealtimeConnection {
  const socket = new WebSocket(getWebSocketUrl());
  let connected = false;

  socket.addEventListener("open", () => {
    connected = true;
    handlers.onToast("聊天服务已连接");
    socket.send(JSON.stringify({ type: "join", profile, sessionToken, x, y }));
  });

  socket.addEventListener("message", (event) => {
    let message: any;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    if (message.type === "snapshot") {
      handlers.onSnapshot(message.players ?? []);
      return;
    }
    if (message.type === "playerJoined") {
      handlers.onPlayerJoined(message.player);
      return;
    }
    if (message.type === "playerMoved") {
      handlers.onPlayerMoved(String(message.id), Number(message.x), Number(message.y));
      return;
    }
    if (message.type === "playerLeft") {
      handlers.onPlayerLeft(String(message.id));
      return;
    }
    if (message.type === "chat") {
      handlers.onChat(String(message.id), String(message.username ?? ""), String(message.text ?? "").slice(0, 80));
    }
  });

  socket.addEventListener("close", () => {
    connected = false;
    handlers.onToast("聊天服务已断开");
  });

  return {
    sendMove(nextX, nextY) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "move", x: nextX, y: nextY }));
      }
    },
    sendChat(text) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "chat", text }));
      }
    },
    close() {
      socket.close();
    },
    isConnected() {
      return connected && socket.readyState === WebSocket.OPEN;
    }
  };
}

function connectSupabaseRealtime(profile: PlayerProfile, x: number, y: number, handlers: TownRealtimeHandlers): TownRealtimeConnection {
  const supabase = getSupabase();
  if (!supabase) {
    handlers.onToast("Supabase 未配置");
    return emptyConnection();
  }

  let connected = false;
  let lastX = x;
  let lastY = y;
  let knownIds = new Set<string>();
  const channel = supabase.channel("aero-world-town", {
    config: {
      presence: {
        key: profile.id
      }
    }
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const players = flattenPresence(channel.presenceState()).filter((player) => player.id !== profile.id);
      const nextIds = new Set(players.map((player) => player.id));
      for (const id of knownIds) {
        if (!nextIds.has(id)) {
          handlers.onPlayerLeft(id);
        }
      }
      knownIds = nextIds;
      handlers.onSnapshot(players);
    })
    .on("broadcast", { event: "move" }, ({ payload }) => {
      if (payload?.id !== profile.id) {
        handlers.onPlayerMoved(String(payload.id), Number(payload.x), Number(payload.y));
      }
    })
    .on("broadcast", { event: "chat" }, ({ payload }) => {
      handlers.onChat(String(payload.id), String(payload.username ?? ""), String(payload.text ?? "").slice(0, 80));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        connected = true;
        handlers.onToast("聊天服务已连接");
        await channel.track({
          id: profile.id,
          username: profile.username,
          x: lastX,
          y: lastY,
          onlineAt: new Date().toISOString()
        });
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        connected = false;
        handlers.onToast("聊天服务已断开");
      }
    });

  return {
    sendMove(nextX, nextY) {
      lastX = nextX;
      lastY = nextY;
      void channel.track({
        id: profile.id,
        username: profile.username,
        x: nextX,
        y: nextY,
        onlineAt: new Date().toISOString()
      });
      void channel.send({ type: "broadcast", event: "move", payload: { id: profile.id, x: nextX, y: nextY } });
    },
    async sendChat(text) {
      const message = text.trim().slice(0, 80);
      if (!message) {
        return;
      }
      const { data } = await supabase
        .from("chat_messages")
        .insert({ account_id: profile.id, username: profile.username, text: message })
        .select("id,created_at")
        .single();
      void channel.send({
        type: "broadcast",
        event: "chat",
        payload: { id: profile.id, username: profile.username, text: message, messageId: data?.id, createdAt: data?.created_at }
      });
    },
    close() {
      void channel.untrack();
      void supabase.removeChannel(channel);
      connected = false;
    },
    isConnected() {
      return connected;
    }
  };
}

function flattenPresence(state: Record<string, any[]>): TownPlayerSnapshot[] {
  return Object.values(state)
    .flat()
    .map((entry) => ({
      id: String(entry.id),
      username: String(entry.username ?? "玩家").slice(0, 16),
      x: Number(entry.x) || 514,
      y: Number(entry.y) || 364
    }))
    .filter((entry) => entry.id);
}

function emptyConnection(): TownRealtimeConnection {
  return {
    sendMove() {},
    sendChat() {},
    close() {},
    isConnected() {
      return false;
    }
  };
}

function getWebSocketUrl() {
  const configuredUrl = import.meta.env.VITE_WS_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const isViteDevServer = window.location.port === "5173" || window.location.port === "5174";
  if (isViteDevServer) {
    return `${protocol}://${window.location.hostname || "127.0.0.1"}:5175`;
  }

  return `${protocol}://${window.location.host}/ws`;
}

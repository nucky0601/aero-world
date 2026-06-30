import { getSupabase, isAdminEmail, isSupabaseEnabled } from "../services/supabase";

export interface PlayerProfile {
  id: string;
  email: string;
  username: string;
  role?: "player" | "admin";
}

interface AccountSession {
  profile: PlayerProfile;
  sessionToken: string;
}

type AccountMode = "login" | "register";

const STORAGE_KEY = "pixel-town-account-v2";
let currentProfile: PlayerProfile | null = null;
let currentSessionToken = "";

export function getCurrentProfile() {
  return currentProfile;
}

export function getCurrentSessionToken() {
  return currentSessionToken;
}

export function getAuthHeaders(token = currentSessionToken) {
  return {
    Authorization: `Bearer ${token}`
  };
}

export function setChatVisible(visible: boolean) {
  const chat = document.querySelector<HTMLElement>("#chat-panel");
  if (chat) {
    chat.hidden = !visible;
  }
}

export async function ensureProfile(): Promise<PlayerProfile> {
  const saved = readSavedSession();
  if (saved) {
    const verified = await verifySavedSession(saved);
    if (verified) {
      return activateSession(verified);
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  return new Promise((resolve) => {
    renderAccountPanel((session) => {
      resolve(activateSession(session));
    });
  });
}

function activateSession(session: AccountSession) {
  currentProfile = session.profile;
  currentSessionToken = session.sessionToken;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  document.querySelector("#register-panel")?.remove();
  renderAccountChip(session.profile);
  renderChatPanel();
  void renderAnnouncements();
  return session.profile;
}

function readSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AccountSession;
    if (!parsed.sessionToken || !isValidProfile(parsed.profile)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function verifySavedSession(session: AccountSession) {
  if (isSupabaseEnabled()) {
    return verifySupabaseSession();
  }

  try {
    const result = await apiRequest<{ profile: PlayerProfile }>("/api/me", {
      headers: authHeaders(session.sessionToken)
    });
    return {
      profile: result.profile,
      sessionToken: session.sessionToken
    };
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return null;
    }
    return session;
  }
}

function renderAccountPanel(onAuthenticated: (session: AccountSession) => void) {
  const panel = document.createElement("section");
  panel.id = "register-panel";
  document.body.appendChild(panel);

  let mode: AccountMode = "login";
  const render = () => {
    panel.innerHTML = `
      <form class="register-card">
      <div>
        <h1>进入云镜社区</h1>
        <p>账号资料保存在服务器，换手机或电脑后用邮箱密码登录同一个角色。</p>
      </div>
      <div class="account-tabs" role="tablist" aria-label="账号操作">
        <button type="button" data-mode="login" class="${mode === "login" ? "active" : ""}">登录</button>
        <button type="button" data-mode="register" class="${mode === "register" ? "active" : ""}">注册</button>
      </div>
      <label>
        邮箱
        <input name="email" type="email" autocomplete="email" required placeholder="you@example.com" />
      </label>
      ${
        mode === "register"
          ? `
      <label>
        用户名
        <input name="username" type="text" autocomplete="nickname" required maxlength="16" placeholder="显示在角色头顶" />
      </label>
      `
          : ""
      }
      <label>
        密码
        <input name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required minlength="6" placeholder="至少 6 位" />
      </label>
      <button class="account-submit" type="submit">${mode === "login" ? "登录进入" : "注册进入"}</button>
      <p class="form-error" aria-live="assertive"></p>
      <p class="register-note">浏览器会记住登录状态；账号本体由服务器保存，正式部署时请配置免费数据库。</p>
    </form>
  `;

    panel.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        mode = button.dataset.mode === "register" ? "register" : "login";
        render();
      });
    });

    const form = panel.querySelector<HTMLFormElement>("form")!;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitAccountForm(form, mode, onAuthenticated);
    });
  };

  render();
}

async function submitAccountForm(form: HTMLFormElement, mode: AccountMode, onAuthenticated: (session: AccountSession) => void) {
  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const username = String(data.get("username") ?? "").trim().slice(0, 16);
  const password = String(data.get("password") ?? "");
  const errorEl = form.querySelector<HTMLElement>(".form-error")!;
  const submit = form.querySelector<HTMLButtonElement>(".account-submit")!;

  if (!isValidEmail(email) || password.length < 6 || (mode === "register" && username.length < 2)) {
    showFormError(form, "请填写有效邮箱、至少 6 位密码，注册时用户名至少 2 个字符。");
    return;
  }

  errorEl.textContent = "";
  submit.disabled = true;
  submit.textContent = mode === "login" ? "登录中..." : "注册中...";

  try {
    const session = isSupabaseEnabled()
      ? await submitSupabaseAccount(mode, { email, username, password })
      : await apiRequest<AccountSession>(mode === "login" ? "/api/login" : "/api/register", {
          method: "POST",
          body: JSON.stringify(mode === "login" ? { email, password } : { email, username, password })
        });
    onAuthenticated(session);
  } catch (error) {
    showFormError(form, error instanceof Error ? error.message : "账号服务暂时不可用。");
  } finally {
    submit.disabled = false;
    submit.textContent = mode === "login" ? "登录进入" : "注册进入";
  }
}

function renderAccountChip(profile: PlayerProfile) {
  document.querySelector("#account-chip")?.remove();
  const chip = document.createElement("div");
  chip.id = "account-chip";
  chip.innerHTML = `
    <span>${escapeHtml(profile.username)}</span>
    <button type="button" title="更换账号">更换</button>
  `;
  chip.querySelector("button")?.addEventListener("click", async () => {
    const token = currentSessionToken;
    localStorage.removeItem(STORAGE_KEY);
    currentProfile = null;
    currentSessionToken = "";
    if (token) {
      try {
        if (isSupabaseEnabled()) {
          await getSupabase()?.auth.signOut();
        } else {
          await apiRequest("/api/logout", {
            method: "POST",
            headers: authHeaders(token)
          });
        }
      } catch {
        // 退出时即使服务器暂时不可达，也清掉本机登录状态。
      }
    }
    window.location.reload();
  });
  document.body.appendChild(chip);
}

function renderChatPanel() {
  if (document.querySelector("#chat-panel")) {
    return;
  }

  const panel = document.createElement("form");
  panel.id = "chat-panel";
  panel.className = window.matchMedia("(max-width: 760px)").matches ? "collapsed" : "expanded";
  panel.innerHTML = `
    <button type="button" class="chat-toggle" aria-label="打开聊天">聊天</button>
    <div class="chat-fields">
      <input name="message" type="text" maxlength="80" autocomplete="off" enterkeyhint="send" placeholder="输入聊天内容" />
      <button type="button" class="history-button">历史</button>
      <button type="submit">发送</button>
    </div>
  `;
  panel.querySelector<HTMLButtonElement>(".chat-toggle")?.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    panel.classList.toggle("expanded");
    if (panel.classList.contains("expanded")) {
      panel.querySelector<HTMLInputElement>("input")?.focus();
    }
  });
  panel.querySelector<HTMLButtonElement>(".history-button")?.addEventListener("click", () => {
    void openChatHistoryPanel();
  });
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = panel.querySelector<HTMLInputElement>("input")!;
    const text = input.value.replace(/\s+/g, " ").trim();
    if (!text) {
      return;
    }
    window.dispatchEvent(new CustomEvent("pixel-town-chat-submit", { detail: { text } }));
    input.value = "";
    input.blur();
    if (window.matchMedia("(max-width: 760px)").matches) {
      panel.classList.add("collapsed");
      panel.classList.remove("expanded");
    }
  });
  document.body.appendChild(panel);
}

async function renderAnnouncements() {
  document.querySelector("#announcement-chip")?.remove();
  try {
    const result = await apiRequest<{ announcements: Array<{ id: string; title: string; body: string; createdAt: string }> }>("/api/announcements");
    const announcement = result.announcements[0];
    if (!announcement) {
      return;
    }

    const chip = document.createElement("aside");
    chip.id = "announcement-chip";
    chip.innerHTML = `
      <button type="button" title="关闭公告">×</button>
      <strong>${escapeHtml(announcement.title)}</strong>
      <span>${escapeHtml(announcement.body)}</span>
    `;
    chip.querySelector("button")?.addEventListener("click", () => chip.remove());
    document.body.appendChild(chip);
  } catch {
    // 公告不可用不影响进入游戏。
  }
}

async function openChatHistoryPanel() {
  document.querySelector("#chat-history-panel")?.remove();
  const panel = document.createElement("section");
  panel.id = "chat-history-panel";
  panel.innerHTML = `
    <div class="history-card">
      <header>
        <div>
          <h2>聊天历史</h2>
          <p>最近的公开聊天会保存在服务器，方便跨设备查看。</p>
        </div>
        <button type="button" class="close-history" aria-label="关闭">×</button>
      </header>
      <div class="history-list" aria-live="polite">加载中...</div>
    </div>
  `;
  panel.querySelector(".close-history")?.addEventListener("click", () => panel.remove());
  document.body.appendChild(panel);

  try {
    const result = await apiRequest<{
      messages: Array<{ id: string; username: string; text: string; createdAt: string }>;
    }>("/api/chat/history?limit=80", {
      headers: getAuthHeaders()
    });
    const list = panel.querySelector<HTMLElement>(".history-list")!;
    if (!result.messages.length) {
      list.textContent = "暂时还没有聊天记录。";
      return;
    }

    list.innerHTML = result.messages
      .map(
        (message) => `
          <article class="history-item">
            <div>
              <strong>${escapeHtml(message.username)}</strong>
              <time>${formatTime(message.createdAt)}</time>
            </div>
            <p>${escapeHtml(message.text)}</p>
            <button type="button" data-report-user="${escapeHtml(message.username)}">举报</button>
          </article>
        `
      )
      .join("");

    list.querySelectorAll<HTMLButtonElement>("[data-report-user]").forEach((button) => {
      button.addEventListener("click", async () => {
        const targetUsername = button.dataset.reportUser ?? "未知玩家";
        const reason = window.prompt(`举报 ${targetUsername} 的原因：`);
        if (!reason?.trim()) {
          return;
        }
        button.disabled = true;
        try {
          await apiRequest("/api/reports", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ targetUsername, reason: reason.trim() })
          });
          button.textContent = "已举报";
        } catch (error) {
          button.disabled = false;
          window.alert(error instanceof Error ? error.message : "举报失败。");
        }
      });
    });
  } catch (error) {
    panel.querySelector<HTMLElement>(".history-list")!.textContent = error instanceof Error ? error.message : "聊天历史加载失败。";
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidProfile(profile: PlayerProfile | null | undefined): profile is PlayerProfile {
  return Boolean(profile?.id && profile.username && isValidEmail(profile.email));
}

function showFormError(form: HTMLFormElement, message: string) {
  const errorEl = form.querySelector<HTMLElement>(".form-error")!;
  errorEl.textContent = message;
  form.classList.add("shake");
  window.setTimeout(() => form.classList.remove("shake"), 240);
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}

export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (isSupabaseEnabled()) {
    return supabaseRequest<T>(path, init);
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    response = await fetch(path, {
      ...init,
      headers,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("账号服务响应超时，请稍后重试。");
    }
    throw new Error("账号服务没有连上。正式部署后请从网站地址进入，或本地先运行生产服务。");
  } finally {
    window.clearTimeout(timeout);
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(response.status, payload?.message ?? "账号请求失败。");
  }

  if (!payload) {
    throw new Error("账号服务没有正确响应。请确认当前访问的是部署后的游戏网址。");
  }

  return payload as T;
}

async function verifySupabaseSession(): Promise<AccountSession | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    return null;
  }

  const profile = await getOrCreateSupabaseProfile(data.session.user);
  return {
    profile,
    sessionToken: data.session.access_token
  };
}

async function submitSupabaseAccount(mode: AccountMode, values: { email: string; username: string; password: string }): Promise<AccountSession> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase 没有配置，请检查 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。");
  }

  if (mode === "register") {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          username: values.username
        }
      }
    });
    if (error) {
      throw new Error(readableSupabaseError(error.message));
    }
    if (data.user && Array.isArray((data.user as any).identities) && (data.user as any).identities.length === 0) {
      throw new Error("这个邮箱已经注册过，请直接登录。");
    }
    if (!data.session?.user) {
      throw new Error("注册邮件已经发送，请先到邮箱确认后再登录。也可以在 Supabase Auth 设置里关闭邮箱确认。");
    }
    const profile = await getOrCreateSupabaseProfile(data.session.user, values.username);
    return {
      profile,
      sessionToken: data.session.access_token
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password
  });
  if (error || !data.session?.user) {
    throw new Error(readableSupabaseError(error?.message ?? "邮箱或密码不正确。"));
  }

  const profile = await getOrCreateSupabaseProfile(data.session.user);
  return {
    profile,
    sessionToken: data.session.access_token
  };
}

async function getOrCreateSupabaseProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }, preferredUsername?: string): Promise<PlayerProfile> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase 没有配置。");
  }

  const email = (user.email ?? "").toLowerCase();
  const { data } = await supabase.from("profiles").select("id,email,username").eq("id", user.id).maybeSingle();
  if (data?.username) {
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      role: isAdminEmail(data.email) ? "admin" : "player"
    };
  }

  const username =
    preferredUsername?.trim().slice(0, 16) ||
    String(user.user_metadata?.username ?? "")
      .trim()
      .slice(0, 16) ||
    email.split("@")[0].slice(0, 16) ||
    "玩家";

  const { data: upserted, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email, username }, { onConflict: "id" })
    .select("id,email,username")
    .single();
  if (error || !upserted) {
    throw new Error(readableSupabaseError(error?.message ?? "账号资料创建失败。"));
  }

  return {
    id: upserted.id,
    email: upserted.email,
    username: upserted.username,
    role: isAdminEmail(upserted.email) ? "admin" : "player"
  };
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase 没有配置。");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  const profile = user ? await getOrCreateSupabaseProfile(user) : null;
  const method = String(init.method ?? "GET").toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : {};

  if (path === "/api/me") {
    if (!profile || !sessionData.session) {
      throw new ApiError(401, "登录已过期，请重新登录。");
    }
    return { profile } as T;
  }

  if (path === "/api/logout") {
    await supabase.auth.signOut();
    return { ok: true } as T;
  }

  if (path === "/api/announcements") {
    const { data, error } = await supabase.from("announcements").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(5);
    if (error) throw new Error(readableSupabaseError(error.message));
    return { announcements: (data ?? []).map(mapAnnouncement) } as T;
  }

  if (path.startsWith("/api/chat/history")) {
    const limit = Number(new URL(path, window.location.origin).searchParams.get("limit") ?? 80);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,username,text,created_at")
      .order("created_at", { ascending: false })
      .limit(Math.max(20, Math.min(120, limit)));
    if (error) throw new Error(readableSupabaseError(error.message));
    return { messages: (data ?? []).reverse().map(mapChatMessage) } as T;
  }

  if (path === "/api/reports" && method === "POST") {
    if (!profile) throw new ApiError(401, "请先登录。");
    const { data, error } = await supabase
      .from("reports")
      .insert({
        reporter_id: profile.id,
        reporter_username: profile.username,
        target_username: String(body.targetUsername ?? "未知玩家").slice(0, 24),
        reason: String(body.reason ?? "").slice(0, 220)
      })
      .select("id,reporter_username,target_username,reason,status,note,created_at,updated_at")
      .single();
    if (error) throw new Error(readableSupabaseError(error.message));
    return { report: mapReport(data) } as T;
  }

  if (path === "/api/admin/overview") {
    assertAdmin(profile);
    const [announcements, reports, messages] = await Promise.all([
      supabase.from("announcements").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("reports").select("id,reporter_username,target_username,reason,status,note,created_at,updated_at").order("created_at", { ascending: false }).limit(120),
      supabase.from("chat_messages").select("id,username,text,created_at").order("created_at", { ascending: false }).limit(120)
    ]);
    if (announcements.error) throw new Error(readableSupabaseError(announcements.error.message));
    if (reports.error) throw new Error(readableSupabaseError(reports.error.message));
    if (messages.error) throw new Error(readableSupabaseError(messages.error.message));
    return {
      profile,
      onlinePlayers: 0,
      announcements: (announcements.data ?? []).map(mapAnnouncement),
      reports: (reports.data ?? []).map(mapReport),
      messages: (messages.data ?? []).reverse().map(mapChatMessage)
    } as T;
  }

  if (path === "/api/admin/announcements" && method === "POST") {
    assertAdmin(profile);
    const { data, error } = await supabase
      .from("announcements")
      .insert({ title: String(body.title ?? "").slice(0, 40), body: String(body.body ?? "").slice(0, 300), created_by: profile!.email })
      .select("id,title,body,created_at")
      .single();
    if (error) throw new Error(readableSupabaseError(error.message));
    return { announcement: mapAnnouncement(data) } as T;
  }

  if (path === "/api/admin/reports/update" && method === "POST") {
    assertAdmin(profile);
    const { data, error } = await supabase
      .from("reports")
      .update({ status: body.status === "closed" ? "closed" : "open", note: String(body.note ?? "").slice(0, 180), updated_at: new Date().toISOString() })
      .eq("id", String(body.id ?? ""))
      .select("id,reporter_username,target_username,reason,status,note,created_at,updated_at")
      .single();
    if (error) throw new Error(readableSupabaseError(error.message));
    return { report: mapReport(data) } as T;
  }

  throw new ApiError(404, "接口不存在。");
}

function assertAdmin(profile: PlayerProfile | null) {
  if (!profile) {
    throw new ApiError(401, "请先登录。");
  }
  if (!isAdminEmail(profile.email)) {
    throw new ApiError(403, "当前账号不是管理员。请把该邮箱加入 VITE_ADMIN_EMAILS，并在 Supabase 的 admin_emails 表中加入同一个邮箱。");
  }
}

function mapAnnouncement(row: any) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at
  };
}

function mapChatMessage(row: any) {
  return {
    id: row.id,
    username: row.username,
    text: row.text,
    createdAt: row.created_at
  };
}

function mapReport(row: any) {
  return {
    id: row.id,
    reporterUsername: row.reporter_username,
    targetUsername: row.target_username,
    reason: row.reason,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function readableSupabaseError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "邮箱或密码不正确。";
  }
  if (/already registered|already exists|duplicate/i.test(message)) {
    return "这个邮箱已经注册过，请直接登录。";
  }
  return message || "Supabase 请求失败。";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[char];
  });
}

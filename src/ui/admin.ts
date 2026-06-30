import { apiRequest, ensureProfile, getAuthHeaders, setChatVisible } from "./account";

interface AdminOverview {
  profile: {
    email: string;
    username: string;
    role: "player" | "admin";
  };
  onlinePlayers: number;
  announcements: AnnouncementItem[];
  reports: ReportItem[];
  messages: ChatMessageItem[];
}

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface ReportItem {
  id: string;
  reporterUsername: string;
  targetUsername: string;
  reason: string;
  status: "open" | "closed";
  note: string;
  createdAt: string;
}

interface ChatMessageItem {
  id: string;
  username: string;
  text: string;
  createdAt: string;
}

export async function renderAdminApp() {
  document.title = "Aero World 管理中心";
  document.body.classList.add("admin-page");
  const game = document.querySelector<HTMLElement>("#game");
  if (game) {
    game.hidden = true;
  }

  const root = document.createElement("main");
  root.id = "admin-root";
  root.innerHTML = `<section class="admin-loading">正在进入管理中心...</section>`;
  document.body.appendChild(root);

  await ensureProfile();
  setChatVisible(false);
  await loadOverview(root);
}

async function loadOverview(root: HTMLElement) {
  root.innerHTML = `<section class="admin-loading">正在读取服务器状态...</section>`;
  try {
    const overview = await apiRequest<AdminOverview>("/api/admin/overview", {
      headers: getAuthHeaders()
    });
    renderOverview(root, overview);
  } catch (error) {
    renderAdminBlocked(root, error instanceof Error ? error.message : "管理中心暂时不可用。");
  }
}

function renderOverview(root: HTMLElement, overview: AdminOverview) {
  const openReports = overview.reports.filter((report) => report.status === "open").length;
  root.innerHTML = `
    <section class="admin-shell">
      <header class="admin-hero">
        <div>
          <p>Aero World</p>
          <h1>管理中心</h1>
          <span>${escapeHtml(overview.profile.username)} · ${escapeHtml(overview.profile.email)}</span>
        </div>
        <button type="button" class="refresh-admin">刷新</button>
      </header>

      <section class="admin-stats" aria-label="服务器状态">
        <article><strong>${overview.onlinePlayers}</strong><span>在线玩家</span></article>
        <article><strong>${openReports}</strong><span>待处理举报</span></article>
        <article><strong>${overview.messages.length}</strong><span>最近聊天</span></article>
      </section>

      <section class="admin-panel">
        <div class="panel-title">
          <h2>发布公告</h2>
          <p>公告会显示给进入游戏的玩家，用于维护、活动、规则提醒。</p>
        </div>
        <form class="announcement-form">
          <input name="title" maxlength="40" placeholder="公告标题" required />
          <textarea name="body" maxlength="300" rows="4" placeholder="公告内容" required></textarea>
          <button type="submit">发布公告</button>
          <p class="admin-message" aria-live="polite"></p>
        </form>
        <div class="announcement-list">
          ${overview.announcements.map(renderAnnouncement).join("") || "<p>还没有公告。</p>"}
        </div>
      </section>

      <section class="admin-grid">
        <div class="admin-panel">
          <div class="panel-title">
            <h2>举报处理</h2>
            <p>先记录事实，再决定提醒、禁言、封号或关闭举报。</p>
          </div>
          <div class="report-list">
            ${overview.reports.map(renderReport).join("") || "<p>暂时没有举报。</p>"}
          </div>
        </div>

        <div class="admin-panel">
          <div class="panel-title">
            <h2>聊天历史</h2>
            <p>用于回看现场和辅助判断举报。</p>
          </div>
          <div class="admin-chat-list">
            ${overview.messages.map(renderChatMessage).join("") || "<p>暂时没有聊天记录。</p>"}
          </div>
        </div>
      </section>
    </section>
  `;

  root.querySelector(".refresh-admin")?.addEventListener("click", () => void loadOverview(root));
  const form = root.querySelector<HTMLFormElement>(".announcement-form")!;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitAnnouncement(root, form);
  });

  root.querySelectorAll<HTMLButtonElement>("[data-report-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.reportId ?? "";
      const status = button.dataset.nextStatus === "closed" ? "closed" : "open";
      const note = window.prompt(status === "closed" ? "处理备注：" : "重新打开原因：") ?? "";
      await apiRequest("/api/admin/reports/update", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status, note })
      });
      await loadOverview(root);
    });
  });
}

function renderAdminBlocked(root: HTMLElement, message: string) {
  root.innerHTML = `
    <section class="admin-shell admin-blocked">
      <h1>Aero World 管理中心</h1>
      <p>${escapeHtml(message)}</p>
      <div class="admin-panel">
        <h2>管理员入门流程</h2>
        <ol>
          <li>先用你的邮箱在游戏里注册一个普通账号。</li>
          <li>在正式服务器环境变量里设置 <code>ADMIN_EMAILS=你的邮箱</code>。多个管理员用英文逗号分隔。</li>
          <li>重启或重新部署服务器。</li>
          <li>访问 <code>/admin</code>，用这个邮箱登录，就会进入管理中心。</li>
        </ol>
        <p>管理员后台通常负责公告、举报、聊天审计、玩家处罚和运营活动。现在先准备了公告、举报、聊天历史三个最小必需模块。</p>
      </div>
      <button type="button" class="refresh-admin">重新检查</button>
    </section>
  `;
  root.querySelector(".refresh-admin")?.addEventListener("click", () => void loadOverview(root));
}

async function submitAnnouncement(root: HTMLElement, form: HTMLFormElement) {
  const data = new FormData(form);
  const title = String(data.get("title") ?? "").trim();
  const body = String(data.get("body") ?? "").trim();
  const message = form.querySelector<HTMLElement>(".admin-message")!;
  message.textContent = "";

  try {
    await apiRequest("/api/admin/announcements", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, body })
    });
    form.reset();
    await loadOverview(root);
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "公告发布失败。";
  }
}

function renderAnnouncement(item: AnnouncementItem) {
  return `
    <article class="announcement-row">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
      <time>${formatTime(item.createdAt)}</time>
    </article>
  `;
}

function renderReport(report: ReportItem) {
  const nextStatus = report.status === "open" ? "closed" : "open";
  return `
    <article class="report-row ${report.status}">
      <div>
        <strong>${escapeHtml(report.targetUsername)}</strong>
        <span>${report.status === "open" ? "待处理" : "已处理"}</span>
      </div>
      <p>举报人：${escapeHtml(report.reporterUsername)}</p>
      <p>原因：${escapeHtml(report.reason)}</p>
      ${report.note ? `<p>备注：${escapeHtml(report.note)}</p>` : ""}
      <time>${formatTime(report.createdAt)}</time>
      <button type="button" data-report-id="${escapeHtml(report.id)}" data-next-status="${nextStatus}">
        ${report.status === "open" ? "标记已处理" : "重新打开"}
      </button>
    </article>
  `;
}

function renderChatMessage(message: ChatMessageItem) {
  return `
    <article class="admin-chat-row">
      <div><strong>${escapeHtml(message.username)}</strong><time>${formatTime(message.createdAt)}</time></div>
      <p>${escapeHtml(message.text)}</p>
    </article>
  `;
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

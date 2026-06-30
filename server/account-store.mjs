import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;
const scryptAsync = promisify(scrypt);
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SESSION_DAYS = 45;

export async function createAccountStore() {
  if (process.env.DATABASE_URL) {
    const store = new PostgresAccountStore(process.env.DATABASE_URL);
    await store.init();
    return store;
  }

  const dataDir = process.env.DATA_DIR ?? join(PROJECT_ROOT, "data");
  const store = new JsonAccountStore(join(dataDir, "accounts.json"));
  await store.init();
  return store;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return {
    passwordHash: Buffer.from(hash).toString("hex"),
    passwordSalt: salt
  };
}

export async function verifyPassword(password, account) {
  if (!account?.passwordHash || !account?.passwordSalt) {
    return false;
  }

  const expected = Buffer.from(account.passwordHash, "hex");
  const actual = await scryptAsync(password, account.passwordSalt, expected.length);
  const actualBuffer = Buffer.from(actual);
  return actualBuffer.length === expected.length && timingSafeEqual(actualBuffer, expected);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function toProfile(account) {
  return {
    id: account.id,
    email: account.email,
    username: account.username
  };
}

function duplicateEmailError() {
  const error = new Error("EMAIL_EXISTS");
  error.code = "EMAIL_EXISTS";
  return error;
}

function normalizeRows(data) {
  return {
    accounts: Array.isArray(data?.accounts) ? data.accounts : [],
    sessions: Array.isArray(data?.sessions) ? data.sessions : [],
    chatMessages: Array.isArray(data?.chatMessages) ? data.chatMessages : [],
    announcements: Array.isArray(data?.announcements) ? data.announcements : [],
    reports: Array.isArray(data?.reports) ? data.reports : []
  };
}

function shouldUseSsl(connectionString) {
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }
  return !/localhost|127\.0\.0\.1/.test(connectionString);
}

class PostgresAccountStore {
  constructor(connectionString) {
    this.kind = "postgres";
    this.pool = new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        username TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT,
        reporter_username TEXT NOT NULL,
        target_username TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async createAccount({ email, username, passwordHash, passwordSalt }) {
    try {
      const result = await this.pool.query(
        `
          INSERT INTO accounts (id, email, username, password_hash, password_salt)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, email, username, password_hash AS "passwordHash", password_salt AS "passwordSalt", created_at AS "createdAt"
        `,
        [randomUUID(), email, username, passwordHash, passwordSalt]
      );
      return result.rows[0];
    } catch (error) {
      if (error?.code === "23505") {
        throw duplicateEmailError();
      }
      throw error;
    }
  }

  async findAccountByEmail(email) {
    const result = await this.pool.query(
      `
        SELECT id, email, username, password_hash AS "passwordHash", password_salt AS "passwordSalt", created_at AS "createdAt"
        FROM accounts
        WHERE email = $1
      `,
      [email]
    );
    return result.rows[0] ?? null;
  }

  async createSession({ accountId, tokenHash, expiresAt }) {
    await this.pool.query(
      `
        INSERT INTO sessions (token_hash, account_id, expires_at)
        VALUES ($1, $2, $3)
      `,
      [tokenHash, accountId, expiresAt]
    );
  }

  async findProfileBySession(tokenHash) {
    await this.pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
    const result = await this.pool.query(
      `
        SELECT a.id, a.email, a.username
        FROM sessions s
        INNER JOIN accounts a ON a.id = s.account_id
        WHERE s.token_hash = $1 AND s.expires_at > NOW()
      `,
      [tokenHash]
    );
    return result.rows[0] ? toProfile(result.rows[0]) : null;
  }

  async deleteSession(tokenHash) {
    await this.pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }

  async addChatMessage({ accountId, username, text }) {
    const result = await this.pool.query(
      `
        INSERT INTO chat_messages (id, account_id, username, body)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, body AS text, created_at AS "createdAt"
      `,
      [randomUUID(), accountId, username, text]
    );
    return result.rows[0];
  }

  async listChatMessages(limit = 80) {
    const result = await this.pool.query(
      `
        SELECT id, username, body AS text, created_at AS "createdAt"
        FROM chat_messages
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.reverse();
  }

  async addAnnouncement({ title, body, createdBy }) {
    const result = await this.pool.query(
      `
        INSERT INTO announcements (id, title, body, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, body, created_by AS "createdBy", created_at AS "createdAt"
      `,
      [randomUUID(), title, body, createdBy]
    );
    return result.rows[0];
  }

  async listAnnouncements(limit = 10) {
    const result = await this.pool.query(
      `
        SELECT id, title, body, created_by AS "createdBy", created_at AS "createdAt"
        FROM announcements
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows;
  }

  async addReport({ reporterId, reporterUsername, targetUsername, reason }) {
    const result = await this.pool.query(
      `
        INSERT INTO reports (id, reporter_id, reporter_username, target_username, reason)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, reporter_username AS "reporterUsername", target_username AS "targetUsername", reason, status, note, created_at AS "createdAt", updated_at AS "updatedAt"
      `,
      [randomUUID(), reporterId, reporterUsername, targetUsername, reason]
    );
    return result.rows[0];
  }

  async listReports(limit = 80) {
    const result = await this.pool.query(
      `
        SELECT id, reporter_username AS "reporterUsername", target_username AS "targetUsername", reason, status, note, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM reports
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows;
  }

  async updateReport({ id, status, note }) {
    const result = await this.pool.query(
      `
        UPDATE reports
        SET status = $2, note = $3, updated_at = NOW()
        WHERE id = $1
        RETURNING id, reporter_username AS "reporterUsername", target_username AS "targetUsername", reason, status, note, created_at AS "createdAt", updated_at AS "updatedAt"
      `,
      [id, status, note]
    );
    return result.rows[0] ?? null;
  }
}

class JsonAccountStore {
  constructor(filePath) {
    this.kind = "json";
    this.filePath = filePath;
    this.state = normalizeRows(null);
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });
    if (!existsSync(this.filePath)) {
      await this.save();
      return;
    }

    try {
      this.state = normalizeRows(JSON.parse(await readFile(this.filePath, "utf8")));
    } catch {
      this.state = normalizeRows(null);
      await this.save();
    }
  }

  async save() {
    await writeFile(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
  }

  async createAccount({ email, username, passwordHash, passwordSalt }) {
    if (this.state.accounts.some((account) => account.email === email)) {
      throw duplicateEmailError();
    }

    const account = {
      id: randomUUID(),
      email,
      username,
      passwordHash,
      passwordSalt,
      createdAt: new Date().toISOString()
    };
    this.state.accounts.push(account);
    await this.save();
    return account;
  }

  async findAccountByEmail(email) {
    return this.state.accounts.find((account) => account.email === email) ?? null;
  }

  async createSession({ accountId, tokenHash, expiresAt }) {
    this.state.sessions.push({
      tokenHash,
      accountId,
      createdAt: new Date().toISOString(),
      expiresAt
    });
    await this.save();
  }

  async findProfileBySession(tokenHash) {
    const now = Date.now();
    const before = this.state.sessions.length;
    this.state.sessions = this.state.sessions.filter((session) => Date.parse(session.expiresAt) > now);
    if (before !== this.state.sessions.length) {
      await this.save();
    }

    const session = this.state.sessions.find((item) => item.tokenHash === tokenHash);
    if (!session) {
      return null;
    }

    const account = this.state.accounts.find((item) => item.id === session.accountId);
    return account ? toProfile(account) : null;
  }

  async deleteSession(tokenHash) {
    const before = this.state.sessions.length;
    this.state.sessions = this.state.sessions.filter((session) => session.tokenHash !== tokenHash);
    if (before !== this.state.sessions.length) {
      await this.save();
    }
  }

  async addChatMessage({ accountId, username, text }) {
    const message = {
      id: randomUUID(),
      accountId,
      username,
      text,
      createdAt: new Date().toISOString()
    };
    this.state.chatMessages.push(message);
    this.state.chatMessages = this.state.chatMessages.slice(-300);
    await this.save();
    return publicChatMessage(message);
  }

  async listChatMessages(limit = 80) {
    return this.state.chatMessages.slice(-limit).map(publicChatMessage);
  }

  async addAnnouncement({ title, body, createdBy }) {
    const announcement = {
      id: randomUUID(),
      title,
      body,
      createdBy,
      createdAt: new Date().toISOString()
    };
    this.state.announcements.unshift(announcement);
    await this.save();
    return announcement;
  }

  async listAnnouncements(limit = 10) {
    return this.state.announcements.slice(0, limit);
  }

  async addReport({ reporterId, reporterUsername, targetUsername, reason }) {
    const report = {
      id: randomUUID(),
      reporterId,
      reporterUsername,
      targetUsername,
      reason,
      status: "open",
      note: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.reports.unshift(report);
    await this.save();
    return publicReport(report);
  }

  async listReports(limit = 80) {
    return this.state.reports.slice(0, limit).map(publicReport);
  }

  async updateReport({ id, status, note }) {
    const report = this.state.reports.find((item) => item.id === id);
    if (!report) {
      return null;
    }
    report.status = status;
    report.note = note;
    report.updatedAt = new Date().toISOString();
    await this.save();
    return publicReport(report);
  }
}

function publicChatMessage(message) {
  return {
    id: message.id,
    username: message.username,
    text: message.text,
    createdAt: message.createdAt
  };
}

function publicReport(report) {
  return {
    id: report.id,
    reporterUsername: report.reporterUsername,
    targetUsername: report.targetUsername,
    reason: report.reason,
    status: report.status,
    note: report.note,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

import { DatabaseSync } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import { createCsrfToken, createSessionId, hashPassword, verifyPassword } from './auth.js';
import { HttpError } from './http-error.js';
import type { TrashRecordInput } from './storage.js';

export interface SessionRecord {
  id: string;
  username: string;
  csrfToken: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface TrashRecord extends TrashRecordInput {}

interface AdminUserRow {
  username: string;
  password_hash: string;
}

interface SessionRow {
  id: string;
  username: string;
  csrf_token: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

interface TrashRow {
  id: string;
  original_path: string;
  storage_name: string;
  item_name: string;
  item_kind: 'file' | 'directory';
  deleted_at: string;
  size_bytes: number;
  mime_type: string | null;
}

export class AppDatabase {
  private db: DatabaseSync;
  private sessionTtlMs: number;

  constructor(databasePath: string, sessionTtlMs: number) {
    this.db = new DatabaseSync(databasePath);
    this.sessionTtlMs = sessionTtlMs;
  }

  async init(dataDir: string): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS admin_user (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trash_records (
        id TEXT PRIMARY KEY,
        original_path TEXT NOT NULL,
        storage_name TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_kind TEXT NOT NULL,
        deleted_at TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT
      );
    `);
    this.deleteExpiredSessions();
  }

  close(): void {
    this.db.close();
  }

  async ensureAdmin(username: string, password?: string): Promise<void> {
    const existing = this.db
      .prepare('SELECT username, password_hash FROM admin_user WHERE id = 1')
      .get() as AdminUserRow | undefined;

    if (existing) {
      return;
    }

    if (!password) {
      throw new HttpError(500, 'ADMIN_PASSWORD must be set when bootstrapping the admin account.');
    }

    const passwordHash = await hashPassword(password);
    this.db
      .prepare(
        'INSERT INTO admin_user (id, username, password_hash, created_at) VALUES (1, ?, ?, ?)'
      )
      .run(username, passwordHash, new Date().toISOString());
  }

  async verifyAdminCredentials(username: string, password: string): Promise<boolean> {
    const adminUser = this.db
      .prepare('SELECT username, password_hash FROM admin_user WHERE username = ?')
      .get(username) as AdminUserRow | undefined;

    if (!adminUser) {
      return false;
    }

    return verifyPassword(adminUser.password_hash, password);
  }

  createSession(username: string): SessionRecord {
    const now = new Date();
    const session: SessionRecord = {
      id: createSessionId(),
      username,
      csrfToken: createCsrfToken(),
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.sessionTtlMs).toISOString(),
    };

    this.db
      .prepare(
        'INSERT INTO sessions (id, username, csrf_token, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        session.id,
        session.username,
        session.csrfToken,
        session.createdAt,
        session.lastSeenAt,
        session.expiresAt
      );

    return session;
  }

  getSession(sessionId: string): SessionRecord | null {
    const row = this.db
      .prepare(
        'SELECT id, username, csrf_token, created_at, last_seen_at, expires_at FROM sessions WHERE id = ?'
      )
      .get(sessionId) as SessionRow | undefined;

    if (!row) {
      return null;
    }

    if (Date.parse(row.expires_at) <= Date.now()) {
      this.deleteSession(sessionId);
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      csrfToken: row.csrf_token,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
    };
  }

  touchSession(sessionId: string): void {
    const now = new Date();
    this.db
      .prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?')
      .run(now.toISOString(), new Date(now.getTime() + this.sessionTtlMs).toISOString(), sessionId);
  }

  deleteSession(sessionId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  deleteExpiredSessions(): void {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
  }

  insertTrashRecord(record: TrashRecordInput): void {
    this.db
      .prepare(
        `INSERT INTO trash_records (
          id, original_path, storage_name, item_name, item_kind, deleted_at, size_bytes, mime_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.originalPath,
        record.storageName,
        record.itemName,
        record.itemKind,
        record.deletedAt,
        record.sizeBytes,
        record.mimeType
      );
  }

  listTrashRecords(): TrashRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, original_path, storage_name, item_name, item_kind, deleted_at, size_bytes, mime_type
         FROM trash_records
         ORDER BY deleted_at DESC`
      )
      .all() as unknown as TrashRow[];

    return rows.map((row) => ({
      id: row.id,
      originalPath: row.original_path,
      storageName: row.storage_name,
      itemName: row.item_name,
      itemKind: row.item_kind,
      deletedAt: row.deleted_at,
      sizeBytes: row.size_bytes,
      mimeType: row.mime_type,
    }));
  }

  getTrashRecord(id: string): TrashRecord | null {
    const row = this.db
      .prepare(
        `SELECT id, original_path, storage_name, item_name, item_kind, deleted_at, size_bytes, mime_type
         FROM trash_records WHERE id = ?`
      )
      .get(id) as TrashRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      originalPath: row.original_path,
      storageName: row.storage_name,
      itemName: row.item_name,
      itemKind: row.item_kind,
      deletedAt: row.deleted_at,
      sizeBytes: row.size_bytes,
      mimeType: row.mime_type,
    };
  }

  deleteTrashRecord(id: string): void {
    this.db.prepare('DELETE FROM trash_records WHERE id = ?').run(id);
  }
}

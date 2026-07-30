import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";
import type { BirthdayCard, CardInput, CardTheme, User } from "./types";
import { DEFAULT_THEME } from "./types";
import { normalizeImageTransition } from "./transitions";

declare global {
  // eslint-disable-next-line no-var
  var __birthdayDb: Client | undefined;
  // eslint-disable-next-line no-var
  var __birthdaySchemaReady: boolean | undefined;
}

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

function isRemoteUrl(url: string | undefined): url is string {
  return Boolean(
    url &&
      (url.startsWith("libsql://") ||
        url.startsWith("https://") ||
        url.startsWith("http://")),
  );
}

function isVercel() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

function getDbPath() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "birthday.db");
}

function fileUrl(dbPath: string) {
  const normalized = dbPath.replace(/\\/g, "/");
  return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
}

export function getDatabaseMode(): "remote" | "local" {
  if (isRemoteUrl(process.env.TURSO_DATABASE_URL)) return "remote";
  if (isVercel()) {
    throw new DatabaseConfigError(
      "Local SQLite cannot run on Vercel. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Vercel project Environment Variables, then redeploy.",
    );
  }
  return "local";
}

function getClient(): Client {
  if (globalThis.__birthdayDb) return globalThis.__birthdayDb;

  const mode = getDatabaseMode();
  if (mode === "remote") {
    const url = process.env.TURSO_DATABASE_URL!;
    globalThis.__birthdayDb = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } else {
    globalThis.__birthdayDb = createClient({
      url: fileUrl(getDbPath()),
    });
  }

  return globalThis.__birthdayDb;
}

export async function initDb() {
  const db = getClient();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT,
      recipient_phone TEXT,
      sender_name TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      theme_json TEXT NOT NULL,
      images_json TEXT NOT NULL,
      video_url TEXT,
      image_transition TEXT NOT NULL DEFAULT 'fade',
      music_enabled INTEGER NOT NULL DEFAULT 1,
      share_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  if (!globalThis.__birthdaySchemaReady) {
    try {
      await db.execute(
        `ALTER TABLE cards ADD COLUMN image_transition TEXT NOT NULL DEFAULT 'fade'`,
      );
    } catch {
      // column already exists
    }
    globalThis.__birthdaySchemaReady = true;
  }
}

function parseTheme(raw: string): CardTheme {
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THEME;
  }
}

function parseImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function mapCard(row: Record<string, unknown>): BirthdayCard {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    recipientName: String(row.recipient_name),
    recipientEmail: row.recipient_email ? String(row.recipient_email) : null,
    recipientPhone: row.recipient_phone ? String(row.recipient_phone) : null,
    senderName: String(row.sender_name),
    title: String(row.title),
    message: String(row.message),
    theme: parseTheme(String(row.theme_json ?? "{}")),
    images: parseImages(String(row.images_json ?? "[]")),
    videoUrl: row.video_url ? String(row.video_url) : null,
    imageTransition: normalizeImageTransition(row.image_transition),
    musicEnabled: Boolean(row.music_enabled),
    shareToken: String(row.share_token),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function dbErrorMessage(error: unknown) {
  if (error instanceof DatabaseConfigError) return error.message;
  if (error instanceof Error) return error.message;
  return "Database error";
}

export async function createUser(input: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  try {
    await initDb();
    const createdAt = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [input.id, input.name, input.email.toLowerCase(), input.passwordHash, createdAt],
    });
    return {
      id: input.id,
      name: input.name,
      email: input.email.toLowerCase(),
      createdAt,
    };
  } catch (error) {
    throw new Error(dbErrorMessage(error));
  }
}

export async function getUserByEmail(email: string) {
  try {
    await initDb();
    const result = await getClient().execute({
      sql: `SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?`,
      args: [email.toLowerCase()],
    });
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      createdAt: String(row.created_at),
    };
  } catch (error) {
    throw new Error(dbErrorMessage(error));
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    await initDb();
    const result = await getClient().execute({
      sql: `SELECT id, name, email, created_at FROM users WHERE id = ?`,
      args: [id],
    });
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      createdAt: String(row.created_at),
    };
  } catch (error) {
    throw new Error(dbErrorMessage(error));
  }
}

export async function listCardsForUser(userId: string): Promise<BirthdayCard[]> {
  await initDb();
  const result = await getClient().execute({
    sql: `SELECT * FROM cards WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((row) => mapCard(row as Record<string, unknown>));
}

export async function getCardById(id: string): Promise<BirthdayCard | null> {
  await initDb();
  const result = await getClient().execute({
    sql: `SELECT * FROM cards WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapCard(row as Record<string, unknown>) : null;
}

export async function getCardByToken(token: string): Promise<BirthdayCard | null> {
  await initDb();
  const result = await getClient().execute({
    sql: `SELECT * FROM cards WHERE share_token = ?`,
    args: [token],
  });
  const row = result.rows[0];
  return row ? mapCard(row as Record<string, unknown>) : null;
}

export async function insertCard(input: {
  id: string;
  userId: string;
  shareToken: string;
  data: CardInput;
}): Promise<BirthdayCard> {
  await initDb();
  const now = new Date().toISOString();
  const theme = { ...DEFAULT_THEME, ...input.data.theme };
  await getClient().execute({
    sql: `INSERT INTO cards (
      id, user_id, recipient_name, recipient_email, recipient_phone,
      sender_name, title, message, theme_json, images_json, video_url,
      image_transition, music_enabled, share_token, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.id,
      input.userId,
      input.data.recipientName.trim(),
      input.data.recipientEmail?.trim() || null,
      input.data.recipientPhone?.trim() || null,
      input.data.senderName.trim(),
      input.data.title.trim(),
      input.data.message.trim(),
      JSON.stringify(theme),
      JSON.stringify(input.data.images ?? []),
      input.data.videoUrl || null,
      normalizeImageTransition(input.data.imageTransition),
      input.data.musicEnabled === false ? 0 : 1,
      input.shareToken,
      now,
      now,
    ],
  });
  const card = await getCardById(input.id);
  if (!card) throw new Error("Failed to create card");
  return card;
}

export async function updateCard(
  id: string,
  userId: string,
  data: CardInput,
): Promise<BirthdayCard | null> {
  await initDb();
  const existing = await getCardById(id);
  if (!existing || existing.userId !== userId) return null;
  const now = new Date().toISOString();
  const theme = { ...DEFAULT_THEME, ...data.theme };
  await getClient().execute({
    sql: `UPDATE cards SET
      recipient_name = ?, recipient_email = ?, recipient_phone = ?,
      sender_name = ?, title = ?, message = ?, theme_json = ?,
      images_json = ?, video_url = ?, image_transition = ?, music_enabled = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
    args: [
      data.recipientName.trim(),
      data.recipientEmail?.trim() || null,
      data.recipientPhone?.trim() || null,
      data.senderName.trim(),
      data.title.trim(),
      data.message.trim(),
      JSON.stringify(theme),
      JSON.stringify(data.images ?? []),
      data.videoUrl || null,
      normalizeImageTransition(data.imageTransition),
      data.musicEnabled === false ? 0 : 1,
      now,
      id,
      userId,
    ],
  });
  return getCardById(id);
}

export async function deleteCard(id: string, userId: string): Promise<boolean> {
  await initDb();
  const result = await getClient().execute({
    sql: `DELETE FROM cards WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

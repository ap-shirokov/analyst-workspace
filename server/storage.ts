import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { desc, eq } from 'drizzle-orm';
import path from 'path';
import { fileURLToPath } from 'url';
import { history, type InsertHistory, type SelectHistory } from '../shared/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Store DB in project root so it persists between runs
const DB_PATH = path.resolve(__dirname, '..', 'history.db');

const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite);

// Create table if not exists (simple migration)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool TEXT NOT NULL,
    title TEXT NOT NULL,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

export interface IStorage {
  addHistory(entry: InsertHistory): SelectHistory;
  getHistory(limit?: number): SelectHistory[];
  deleteHistory(id: number): void;
  clearHistory(): void;
}

export class SqliteStorage implements IStorage {
  addHistory(entry: InsertHistory): SelectHistory {
    const result = db.insert(history).values(entry).returning().get();
    return result;
  }

  getHistory(limit = 200): SelectHistory[] {
    return db.select().from(history).orderBy(desc(history.createdAt)).limit(limit).all();
  }

  deleteHistory(id: number): void {
    db.delete(history).where(eq(history.id, id)).run();
  }

  clearHistory(): void {
    db.delete(history).run();
  }
}

export const storage = new SqliteStorage();

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { desc, eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { SessionRow, SessionStore } from './session.store';

export const sessions = sqliteTable('sessions', {
  sessionId: text('session_id').primaryKey(),
  userId: text('user_id').notNull(),
  reps: integer('reps').notNull(),
  durationSec: real('duration_sec').notNull(),
  performedAt: integer('performed_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS sessions (
    session_id   TEXT    PRIMARY KEY,
    user_id      TEXT    NOT NULL,
    reps         INTEGER NOT NULL,
    duration_sec REAL    NOT NULL,
    performed_at INTEGER NOT NULL,
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_time ON sessions (user_id, performed_at DESC);
`;

export class SqliteSessionStore implements SessionStore, OnModuleDestroy {
  private readonly sqlite: Database.Database;
  private readonly db: BetterSQLite3Database;

  /** path ':memory:' for tests. */
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.sqlite = new Database(path);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.exec(SCHEMA_SQL);
    this.db = drizzle(this.sqlite);
  }

  async insertIfNew(row: SessionRow): Promise<boolean> {
    // The primary key decides "first or repeat", so concurrent retries can't both insert.
    const result = this.db.insert(sessions).values(row).onConflictDoNothing({ target: sessions.sessionId }).run();
    return result.changes === 1;
  }

  async findById(sessionId: string): Promise<SessionRow | undefined> {
    return this.db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).get();
  }

  async listByUser(userId: string): Promise<SessionRow[]> {
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.performedAt), desc(sessions.sessionId))
      .all();
  }

  onModuleDestroy(): void {
    this.sqlite.close();
  }
}

import type { SessionRow, SessionStore } from '../src/sessions/session.store';

/** Test double with the same contract as SqliteSessionStore. */
export class InMemorySessionStore implements SessionStore {
  readonly rows = new Map<string, SessionRow>();

  async insertIfNew(row: SessionRow): Promise<boolean> {
    if (this.rows.has(row.sessionId)) return false;
    this.rows.set(row.sessionId, { ...row });
    return true;
  }

  async findById(sessionId: string): Promise<SessionRow | undefined> {
    const row = this.rows.get(sessionId);
    return row && { ...row };
  }

  async listByUser(userId: string): Promise<SessionRow[]> {
    return [...this.rows.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.performedAt - a.performedAt || b.sessionId.localeCompare(a.sessionId));
  }
}

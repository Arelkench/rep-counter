/** One row of the sessions table. Times are epoch ms. */
export interface SessionRow {
  sessionId: string;
  userId: string;
  reps: number;
  durationSec: number;
  performedAt: number;
  createdAt: number;
}

export const SESSION_STORE = Symbol('SESSION_STORE');

/** Database access. Async so a Postgres version fits the same interface. */
export interface SessionStore {
  /** false = sessionId already exists, nothing written. */
  insertIfNew(row: SessionRow): Promise<boolean>;
  findById(sessionId: string): Promise<SessionRow | undefined>;
  /** Newest performedAt first. */
  listByUser(userId: string): Promise<SessionRow[]>;
}

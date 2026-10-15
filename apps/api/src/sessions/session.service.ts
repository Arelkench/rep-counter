import { Inject, Injectable } from '@nestjs/common';
import type { Session, StoredSession } from '@rep-counter/core';
import { SESSION_STORE, type SessionRow, type SessionStore } from './session.store';

export type SaveOutcome =
  | { kind: 'created'; session: StoredSession }
  | { kind: 'replayed'; session: StoredSession }
  | { kind: 'conflict' };

/** Saves each session once and lists only the user's own. Knows nothing about HTTP. */
@Injectable()
export class SessionService {
  constructor(@Inject(SESSION_STORE) private readonly store: SessionStore) {}

  async save(userId: string, session: Session): Promise<SaveOutcome> {
    const row = toRow(userId, session, Date.now());
    if (await this.store.insertIfNew(row)) return { kind: 'created', session: toStored(row) };

    const existing = await this.store.findById(session.sessionId);
    if (existing && isSameSession(existing, row)) return { kind: 'replayed', session: toStored(existing) };
    return { kind: 'conflict' };
  }

  async list(userId: string): Promise<StoredSession[]> {
    return (await this.store.listByUser(userId)).map(toStored);
  }
}

function toRow(userId: string, s: Session, now: number): SessionRow {
  return {
    sessionId: s.sessionId,
    userId,
    reps: s.reps,
    durationSec: s.durationSec,
    performedAt: Date.parse(s.performedAt),
    createdAt: now,
  };
}

function toStored(row: SessionRow): StoredSession {
  return {
    sessionId: row.sessionId,
    reps: row.reps,
    durationSec: row.durationSec,
    performedAt: new Date(row.performedAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/** Same owner and same data. performedAt is compared as an instant, so "+02:00" vs "Z" still matches. */
function isSameSession(a: SessionRow, b: SessionRow): boolean {
  return (
    a.userId === b.userId &&
    a.reps === b.reps &&
    a.durationSec === b.durationSec &&
    a.performedAt === b.performedAt
  );
}

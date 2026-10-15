import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SessionRow } from '../src/sessions/session.store';
import { SqliteSessionStore } from '../src/sessions/sqlite-session.store';

const row = (patch: Partial<SessionRow> = {}): SessionRow => ({
  sessionId: 'a1b2c3d4-0000-4000-8000-000000000001',
  userId: 'alice',
  reps: 10,
  durationSec: 36.27,
  performedAt: Date.parse('2026-10-15T10:00:00Z'),
  createdAt: Date.parse('2026-10-15T10:00:05Z'),
  ...patch,
});

describe('SqliteSessionStore', () => {
  const dirs: string[] = [];
  const tempDb = () => {
    const dir = mkdtempSync(join(tmpdir(), 'rep-counter-'));
    dirs.push(dir);
    return join(dir, 'nested', 'sessions.sqlite');
  };

  afterEach(() => {
    dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  it('inserts once; the second insert of the same id writes nothing', async () => {
    const store = new SqliteSessionStore(':memory:');
    expect(await store.insertIfNew(row())).toBe(true);
    expect(await store.insertIfNew(row({ reps: 1, userId: 'bob' }))).toBe(false);
    expect(await store.findById(row().sessionId)).toEqual(row());
    store.onModuleDestroy();
  });

  it('keeps sessions across a restart (creates missing folders)', async () => {
    const path = tempDb();
    const first = new SqliteSessionStore(path);
    await first.insertIfNew(row());
    first.onModuleDestroy();

    const reopened = new SqliteSessionStore(path);
    expect(await reopened.listByUser('alice')).toEqual([row()]);
    reopened.onModuleDestroy();
  });

  it('round-trips numbers exactly, so a replay compares equal', async () => {
    const store = new SqliteSessionStore(':memory:');
    const r = row({ durationSec: 1088 / 30 }); // 36.2666…
    await store.insertIfNew(r);
    expect((await store.findById(r.sessionId))?.durationSec).toBe(r.durationSec);
    store.onModuleDestroy();
  });
});

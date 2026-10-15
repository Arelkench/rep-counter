import { randomUUID } from 'node:crypto';
import type { Session } from '@rep-counter/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../src/sessions/session.service';
import { InMemorySessionStore } from './in-memory-session.store';

const session = (patch: Partial<Session> = {}): Session => ({
  sessionId: randomUUID(),
  reps: 7,
  durationSec: 36,
  performedAt: '2026-10-15T10:00:00.000Z',
  ...patch,
});

describe('SessionService (no HTTP, no database)', () => {
  let store: InMemorySessionStore;
  let service: SessionService;

  beforeEach(() => {
    store = new InMemorySessionStore();
    service = new SessionService(store);
  });

  it('creates, then replays the identical session', async () => {
    const s = session();
    const first = await service.save('alice', s);
    const again = await service.save('alice', s);
    expect(first.kind).toBe('created');
    expect(again).toEqual(first.kind === 'created' && { kind: 'replayed', session: first.session });
    expect(store.rows.size).toBe(1);
  });

  it('keeps the first copy on replay (createdAt does not move)', async () => {
    const s = session();
    const first = await service.save('alice', s);
    await new Promise((r) => setTimeout(r, 5));
    const again = await service.save('alice', s);
    if (first.kind !== 'created' || again.kind !== 'replayed') throw new Error('unexpected outcome');
    expect(again.session.createdAt).toBe(first.session.createdAt);
  });

  it.each([
    ['other reps', { reps: 8 }],
    ['other duration', { durationSec: 35 }],
    ['other moment', { performedAt: '2026-10-15T10:00:01.000Z' }],
  ])('conflicts on %s', async (_, patch) => {
    const s = session();
    await service.save('alice', s);
    expect(await service.save('alice', { ...s, ...patch })).toEqual({ kind: 'conflict' });
  });

  it('conflicts when another user reuses the id, and does not store it for them', async () => {
    const s = session();
    await service.save('alice', s);
    expect(await service.save('bob', s)).toEqual({ kind: 'conflict' });
    expect(await service.list('bob')).toEqual([]);
  });

  it('stores performedAt as an instant and returns it in UTC', async () => {
    const result = await service.save('alice', session({ performedAt: '2026-10-15T12:00:00+02:00' }));
    expect(result.kind === 'created' && result.session.performedAt).toBe('2026-10-15T10:00:00.000Z');
  });

  it("lists only the user's own sessions, newest first", async () => {
    await service.save('alice', session({ performedAt: '2026-10-01T00:00:00Z' }));
    await service.save('bob', session());
    await service.save('alice', session({ performedAt: '2026-10-02T00:00:00Z' }));
    const dates = (await service.list('alice')).map((s) => s.performedAt);
    expect(dates).toEqual(['2026-10-02T00:00:00.000Z', '2026-10-01T00:00:00.000Z']);
  });
});

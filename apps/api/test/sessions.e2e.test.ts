import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { SESSION_STORE } from '../src/sessions/session.store';
import { SqliteSessionStore } from '../src/sessions/sqlite-session.store';

const ALICE = 'Bearer alice-token';
const BOB = 'Bearer bob-token';

const newSession = (patch: Record<string, unknown> = {}) => ({
  sessionId: randomUUID(),
  reps: 10,
  durationSec: 36.27,
  performedAt: '2026-10-15T10:00:00.000Z',
  ...patch,
});

describe('/sessions', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const post = (auth: string, body: object) => http().post('/sessions').set('Authorization', auth).send(body);
  const list = (auth: string) => http().get('/sessions').set('Authorization', auth);

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SESSION_STORE)
      .useValue(new SqliteSessionStore(':memory:'))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('401 without a token', async () => {
      await http().get('/sessions').expect(401);
      await http().post('/sessions').send(newSession()).expect(401);
    });

    it('401 with an unknown token', async () => {
      await list('Bearer nope').expect(401);
    });
  });

  describe('POST', () => {
    it('201 on first save and returns the stored session', async () => {
      const s = newSession();
      const res = await post(ALICE, s).expect(201);
      expect(res.body).toMatchObject(s);
      expect(res.body.createdAt).toEqual(expect.any(String));
    });

    it('200 on an identical repeat, and only one row exists', async () => {
      const s = newSession();
      await post(ALICE, s).expect(201);
      await post(ALICE, s).expect(200);
      const { body } = await list(ALICE).expect(200);
      expect(body.items).toHaveLength(1);
    });

    it('treats the same instant in another timezone as identical', async () => {
      const s = newSession();
      await post(ALICE, s).expect(201);
      await post(ALICE, { ...s, performedAt: '2026-10-15T12:00:00+02:00' }).expect(200);
    });

    it('409 when the same sessionId comes with different data', async () => {
      const s = newSession();
      await post(ALICE, s).expect(201);
      await post(ALICE, { ...s, reps: 9 }).expect(409);
    });

    it('409 when the same sessionId comes from another user', async () => {
      const s = newSession();
      await post(ALICE, s).expect(201);
      await post(BOB, s).expect(409);
      expect((await list(BOB)).body.items).toHaveLength(0);
    });

    it('400 for extra fields such as angles', async () => {
      const res = await post(ALICE, newSession({ angles: [170, 90, 170] })).expect(400);
      expect(res.body.error).toBe('invalid_session');
    });

    it.each([
      ['a non-uuid id', { sessionId: '42' }],
      ['negative reps', { reps: -1 }],
      ['zero duration', { durationSec: 0 }],
      ['a date without timezone', { performedAt: '2026-10-15T10:00:00' }],
    ])('400 for %s', async (_, patch) => {
      await post(ALICE, newSession(patch)).expect(400);
    });
  });

  describe('GET', () => {
    it("returns only the caller's sessions", async () => {
      await post(ALICE, newSession()).expect(201);
      await post(BOB, newSession()).expect(201);
      const alice = (await list(ALICE).expect(200)).body.items;
      const bob = (await list(BOB).expect(200)).body.items;
      expect(alice).toHaveLength(1);
      expect(bob).toHaveLength(1);
      expect(alice[0].sessionId).not.toBe(bob[0].sessionId);
    });

    it('lists newest performedAt first', async () => {
      await post(ALICE, newSession({ performedAt: '2026-10-01T10:00:00Z' })).expect(201);
      await post(ALICE, newSession({ performedAt: '2026-10-03T10:00:00Z' })).expect(201);
      await post(ALICE, newSession({ performedAt: '2026-10-02T10:00:00Z' })).expect(201);
      const dates = (await list(ALICE)).body.items.map((s: { performedAt: string }) => s.performedAt);
      expect(dates).toEqual(['2026-10-03T10:00:00.000Z', '2026-10-02T10:00:00.000Z', '2026-10-01T10:00:00.000Z']);
    });
  });
});

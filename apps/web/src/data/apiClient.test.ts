import type { Session } from '@rep-counter/core';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './apiClient';

const session: Session = {
  sessionId: '3f1c2b4e-8a5d-4c6e-9f7a-1b2c3d4e5f60',
  reps: 8,
  durationSec: 27.6,
  performedAt: '2026-10-15T10:00:00.000Z',
};
const stored = { ...session, createdAt: '2026-10-15T10:00:01.000Z' };

const reply = (status: number, body: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('createApiClient', () => {
  it('sends exactly the four session fields with the Bearer token', async () => {
    const fetchFn = reply(201, stored);
    const result = await createApiClient('alice-token', '/api', fetchFn).save(session);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('/api/sessions');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer alice-token' });
    expect(Object.keys(JSON.parse(init?.body as string)).sort()).toEqual(
      ['durationSec', 'performedAt', 'reps', 'sessionId'],
    );
    expect(result).toEqual({ status: 201, session: stored });
  });

  it('never sends angles, even if a caller sneaks them in', async () => {
    const fetchFn = reply(201, stored);
    const withAngles = { ...session, angles: [170, 90, 170] } as unknown as Session;
    await expect(createApiClient('alice-token', '/api', fetchFn).save(withAngles)).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reports a repeat save as 200', async () => {
    const result = await createApiClient('t', '/api', reply(200, stored)).save(session);
    expect(result.status).toBe(200);
  });

  it('turns an error reply into an ApiError with the server message', async () => {
    const fetchFn = reply(409, { error: 'conflict', message: 'already exists' });
    await expect(createApiClient('t', '/api', fetchFn).save(session)).rejects.toEqual(
      new ApiError(409, 'already exists'),
    );
  });

  it('lists sessions from the items envelope', async () => {
    const sessions = await createApiClient('t', '/api', reply(200, { items: [stored] })).list();
    expect(sessions).toEqual([stored]);
  });
});

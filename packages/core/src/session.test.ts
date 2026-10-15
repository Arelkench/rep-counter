import { describe, expect, it } from 'vitest';
import { SessionSchema } from './session';

const valid = {
  sessionId: '3f1c2b4e-8a5d-4c6e-9f7a-1b2c3d4e5f60',
  reps: 10,
  durationSec: 36.27,
  performedAt: '2026-10-15T10:00:00.000Z',
};

describe('SessionSchema', () => {
  it('accepts a valid session', () => {
    expect(SessionSchema.parse(valid)).toEqual(valid);
  });

  it('accepts a timezone offset', () => {
    expect(SessionSchema.safeParse({ ...valid, performedAt: '2026-10-15T12:00:00+02:00' }).success).toBe(true);
  });

  it('rejects extra fields such as angles', () => {
    expect(SessionSchema.safeParse({ ...valid, angles: [170, 90] }).success).toBe(false);
  });

  it.each([
    ['non-uuid id', { sessionId: 'abc' }],
    ['negative reps', { reps: -1 }],
    ['fractional reps', { reps: 1.5 }],
    ['zero duration', { durationSec: 0 }],
    ['date without timezone', { performedAt: '2026-10-15T10:00:00' }],
  ])('rejects %s', (_, patch) => {
    expect(SessionSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('rejects a missing field', () => {
    const { reps: _, ...rest } = valid;
    expect(SessionSchema.safeParse(rest).success).toBe(false);
  });
});

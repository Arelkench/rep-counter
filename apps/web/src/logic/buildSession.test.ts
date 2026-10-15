import { readFileSync } from 'node:fs';
import { FixtureSchema, SessionSchema } from '@rep-counter/core';
import { describe, expect, it } from 'vitest';
import { buildSession } from './buildSession';

const clean = FixtureSchema.parse(
  JSON.parse(readFileSync(new URL('../../../../fixtures/session-clean.json', import.meta.url), 'utf8')),
);

describe('buildSession', () => {
  it('builds a valid session from a fixture', () => {
    const { session, analysis } = buildSession(
      clean,
      new Date('2026-10-15T10:00:00Z'),
      () => '3f1c2b4e-8a5d-4c6e-9f7a-1b2c3d4e5f60',
    );
    expect(session).toEqual({
      sessionId: '3f1c2b4e-8a5d-4c6e-9f7a-1b2c3d4e5f60',
      reps: 10,
      durationSec: 36.27, // 1088 frames / 30 Hz
      performedAt: '2026-10-15T10:00:00.000Z',
    });
    expect(analysis.repEndFrames).toHaveLength(10);
    expect(SessionSchema.safeParse(session).success).toBe(true);
  });
});

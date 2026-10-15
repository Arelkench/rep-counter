import { analyzeReps, type Fixture, type RepAnalysis, type Session } from '@rep-counter/core';

export interface BuiltSession {
  session: Session;
  analysis: RepAnalysis;
}

/**
 * Result builder: counts the reps and wraps them in a Session.
 * The sessionId is made here, once per analysis, so every resend of this result reuses it.
 */
export function buildSession(fixture: Fixture, now: Date, newId: () => string): BuiltSession {
  const analysis = analyzeReps(fixture.angles);
  return {
    analysis,
    session: {
      sessionId: newId(),
      reps: analysis.reps,
      durationSec: Math.round((fixture.angles.length / fixture.sampleRateHz) * 100) / 100,
      performedAt: now.toISOString(),
    },
  };
}

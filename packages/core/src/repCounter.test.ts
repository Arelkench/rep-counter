import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FixtureSchema } from './fixture';
import { analyzeReps, countReps, INITIAL_STATE, step } from './repCounter';

const fixture = (name: string) =>
  FixtureSchema.parse(JSON.parse(readFileSync(join(__dirname, '../../../fixtures', name), 'utf8')));

/** n frames of the same angle */
const hold = (angle: number | null, n = 5) => Array<number | null>(n).fill(angle);
const squat = () => [...hold(170), ...hold(90), ...hold(170)];

describe('countReps on fixtures', () => {
  it.each([
    ['session-clean.json', 10],
    ['session-noisy.json', 8],
    ['session-shallow.json', 7],
  ])('%s → %i reps', (name, expected) => {
    const f = fixture(name);
    expect(f.expectedReps).toBe(expected);
    expect(countReps(f.angles)).toBe(expected);
  });
});

describe('countReps rules', () => {
  it('counts nothing for empty input', () => {
    expect(countReps([])).toBe(0);
  });

  it('counts one full squat', () => {
    expect(countReps(squat())).toBe(1);
  });

  it('counts a squat that never goes below 100° as nothing', () => {
    expect(countReps([...hold(170), ...hold(110), ...hold(170)])).toBe(0);
  });

  it('does not count a rep that ends at the bottom', () => {
    expect(countReps([...hold(170), ...hold(90)])).toBe(0);
  });

  it('counts a session that starts in the squat', () => {
    expect(countReps([...hold(90), ...hold(170)])).toBe(1);
  });

  it('uses strict thresholds: exactly 100° and 160° are not past the line', () => {
    expect(countReps([...hold(170), ...hold(100), ...hold(160)])).toBe(0);
  });

  it('ignores glitches shorter than 3 frames', () => {
    expect(countReps([...hold(170), 90, 90, ...hold(170)])).toBe(0);
    expect(countReps([...hold(170), ...hold(90), 170, 170, ...hold(90)])).toBe(0);
  });

  it('treats dropped frames as breaking the streak', () => {
    expect(countReps([...hold(170), 90, null, 90, 90, 90, ...hold(170)])).toBe(1);
    expect(countReps([...hold(170), 90, 90, null, 90, 90, ...hold(170)])).toBe(0);
  });

  it('accepts typed arrays', () => {
    expect(countReps(Float32Array.from([...squat(), ...squat()] as number[]))).toBe(2);
  });
});

describe('analyzeReps', () => {
  it('reports the frame where each rep completes', () => {
    // 5 up, 5 down (armed at frame 7), then completes on the 3rd up frame: index 12
    expect(analyzeReps(squat())).toEqual({ reps: 1, repEndFrames: [12] });
  });

  it('agrees with countReps on every fixture', () => {
    for (const name of ['session-clean.json', 'session-noisy.json', 'session-shallow.json']) {
      const { angles } = fixture(name);
      expect(analyzeReps(angles).reps).toBe(countReps(angles));
    }
  });
});

describe('step', () => {
  it('folds to the same result as countReps and never mutates its input', () => {
    const frames = [...squat(), ...squat()];
    const frozen = Object.freeze({ ...INITIAL_STATE });
    const end = frames.reduce((s, a) => step(s, a), frozen);
    expect(end.reps).toBe(2);
    expect(frozen).toEqual(INITIAL_STATE);
  });
});

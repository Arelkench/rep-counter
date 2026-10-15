import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { analyzeReps, countReps, DOWN_DEG, FRAMES, INITIAL_STATE, step, UP_DEG } from './repCounter';

type Frame = number | null;

// ---- generators -------------------------------------------------------------

/** Anything a tracker could produce, including dropped frames and junk numbers. */
const anyFrame: fc.Arbitrary<Frame> = fc.oneof(
  { weight: 8, arbitrary: fc.double({ min: 0, max: 200, noNaN: true }) },
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY) },
);
const anySignal = fc.array(anyFrame, { maxLength: 500 });

const low = fc.double({ min: 60, max: DOWN_DEG - 0.01, noNaN: true }); // deep enough
const mid = fc.double({ min: DOWN_DEG, max: UP_DEG, noNaN: true }); // between the lines, never counts
const high = fc.double({ min: UP_DEG + 0.01, max: 185, noNaN: true }); // back up

/**
 * A hold in one band, optionally with a 1–2 frame glitch of any value.
 * The glitch starts after the first FRAMES real frames, so the crossing itself is never hidden.
 */
const hold = (band: fc.Arbitrary<number>) =>
  fc
    .tuple(
      fc.array(band, { minLength: 8, maxLength: 20 }),
      fc.option(fc.array(anyFrame, { minLength: 1, maxLength: 2 })),
      fc.nat(),
    )
    .map(([frames, glitch, at]): Frame[] => {
      if (!glitch) return frames;
      const pos = FRAMES + (at % (frames.length - FRAMES));
      return [...frames.slice(0, pos), ...glitch, ...frames.slice(pos)];
    });

const transition = fc.array(mid, { maxLength: 6 });

/** k full squats: stand, then k × (go down, hold, come up, hold), sometimes ending stuck at the bottom. */
const squats = fc.integer({ min: 0, max: 12 }).chain((k) =>
  fc
    .tuple(
      hold(high),
      fc.array(fc.tuple(transition, hold(low), transition, hold(high)), { minLength: k, maxLength: k }),
      fc.option(fc.tuple(transition, hold(low))), // an unfinished rep must not count
    )
    .map(([start, reps, unfinished]) => ({ k, signal: [...start, ...reps.flat(2), ...(unfinished?.flat() ?? [])] })),
);

// ---- properties -------------------------------------------------------------

describe('rep counter properties', () => {
  it('countReps, analyzeReps and folding step always agree', () => {
    fc.assert(
      fc.property(anySignal, (signal) => {
        const folded = signal.reduce((s, a) => step(s, a), INITIAL_STATE).reps;
        expect(countReps(signal)).toBe(folded);
        expect(analyzeReps(signal).reps).toBe(folded);
      }),
    );
  });

  it('counts exactly k for k clean squats, even with short glitches', () => {
    fc.assert(
      fc.property(squats, ({ k, signal }) => {
        expect(countReps(signal)).toBe(k);
      }),
    );
  });

  it('never counts a signal that stays between the lines', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(mid, fc.constant(null)), { maxLength: 500 }), (signal) => {
        expect(countReps(signal)).toBe(0);
      }),
    );
  });

  it('never loses reps when more frames are appended', () => {
    fc.assert(
      fc.property(anySignal, anySignal, (a, b) => {
        expect(countReps([...a, ...b])).toBeGreaterThanOrEqual(countReps(a));
      }),
    );
  });

  it('needs at least 2 × FRAMES frames per rep', () => {
    fc.assert(
      fc.property(anySignal, (signal) => {
        expect(countReps(signal)).toBeLessThanOrEqual(Math.floor(signal.length / (2 * FRAMES)));
      }),
    );
  });

  it('marks each rep on a real frame above the line, in order', () => {
    fc.assert(
      fc.property(fc.oneof(anySignal, squats.map((s) => s.signal)), (signal) => {
        const { reps, repEndFrames } = analyzeReps(signal);
        expect(repEndFrames).toHaveLength(reps);
        repEndFrames.forEach((frame, i) => {
          expect(signal[frame]).toBeGreaterThan(UP_DEG);
          if (i > 0) expect(frame).toBeGreaterThan(repEndFrames[i - 1]);
        });
      }),
    );
  });
});

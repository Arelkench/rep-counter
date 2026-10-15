import { bench, describe } from 'vitest';
import { analyzeReps, countReps, INITIAL_STATE, step } from './repCounter';

// 1,000,000 frames ≈ 9.3 hours of squats at 30 Hz: a 3 s squat cycle with tracking noise.
const N = 1_000_000;
const typed = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / 30;
  typed[i] = 135 + 40 * Math.cos((2 * Math.PI * t) / 3) + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 6;
}
const plain = Array.from(typed);

describe(`rep counter, ${N.toLocaleString('en')} frames`, () => {
  bench('countReps (number[])', () => {
    countReps(plain);
  });
  bench('countReps (Float32Array)', () => {
    countReps(typed);
  });
  bench('analyzeReps (with rep frames)', () => {
    analyzeReps(plain);
  });
  bench('step fold (immutable, streaming)', () => {
    let s = INITIAL_STATE;
    for (let i = 0; i < plain.length; i++) s = step(s, plain[i]);
  });
});

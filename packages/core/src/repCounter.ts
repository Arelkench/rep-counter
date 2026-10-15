/** One rep = angle below DOWN_DEG, then above UP_DEG, each held for FRAMES frames in a row. */
export const DOWN_DEG = 100;
export const UP_DEG = 160;
/** 3 frames = 100 ms at 30 Hz: drops one-frame glitches, far shorter than any real squat phase. */
export const FRAMES = 3;

export type Phase = 'UP' | 'DOWN';

export interface RepState {
  readonly phase: Phase;
  readonly streak: number;
  readonly reps: number;
}

export interface RepAnalysis {
  reps: number;
  /** Frame index where each rep was completed. */
  repEndFrames: number[];
}

export const INITIAL_STATE: RepState = { phase: 'UP', streak: 0, reps: 0 };

type Counter = { -readonly [K in keyof RepState]: RepState[K] };

/** Mutates the counter for one frame; returns true when this frame completes a rep. */
function advance(c: Counter, angle: number | null | undefined): boolean {
  const pastLine =
    typeof angle === 'number' && Number.isFinite(angle) && (c.phase === 'UP' ? angle < DOWN_DEG : angle > UP_DEG);
  if (!pastLine) {
    c.streak = 0;
    return false;
  }
  c.streak += 1;
  if (c.streak < FRAMES) return false;

  c.streak = 0;
  if (c.phase === 'UP') {
    c.phase = 'DOWN';
    return false;
  }
  c.phase = 'UP';
  c.reps += 1;
  return true;
}

/** Pure single-frame transition, e.g. for a live camera stream. */
export function step(state: RepState, angle: number | null): RepState {
  const c: Counter = { ...state };
  advance(c, angle);
  return c;
}

export function countReps(angles: ArrayLike<number | null>): number {
  const c: Counter = { ...INITIAL_STATE };
  for (let i = 0; i < angles.length; i++) advance(c, angles[i]);
  return c.reps;
}

export function analyzeReps(angles: ArrayLike<number | null>): RepAnalysis {
  const c: Counter = { ...INITIAL_STATE };
  const repEndFrames: number[] = [];
  for (let i = 0; i < angles.length; i++) {
    if (advance(c, angles[i])) repEndFrames.push(i);
  }
  return { reps: c.reps, repEndFrames };
}

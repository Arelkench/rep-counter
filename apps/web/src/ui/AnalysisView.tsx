import { DOWN_DEG, UP_DEG } from '@rep-counter/core';

interface Props {
  angles: (number | null)[];
  reps: number;
  repEndFrames: number[];
  expectedReps?: number;
}

const W = 800;
const H = 220;
const MIN = 80;
const MAX = 190;

export function AnalysisView({ angles, reps, repEndFrames, expectedReps }: Props) {
  const x = (i: number) => (angles.length > 1 ? (i / (angles.length - 1)) * W : 0);
  const y = (deg: number) => H - ((Math.min(Math.max(deg, MIN), MAX) - MIN) / (MAX - MIN)) * H;

  // One polyline per run of real frames; a dropped frame (null) breaks the line.
  const segments: string[] = [];
  let current: string[] = [];
  angles.forEach((a, i) => {
    if (a === null) {
      if (current.length) segments.push(current.join(' '));
      current = [];
    } else current.push(`${x(i).toFixed(1)},${y(a).toFixed(1)}`);
  });
  if (current.length) segments.push(current.join(' '));

  const matches = expectedReps === undefined ? undefined : reps === expectedReps;

  return (
    <section className="analysis">
      <p className="count">
        Counted <strong>{reps}</strong>
        {expectedReps !== undefined && (
          <>
            , expected <strong>{expectedReps}</strong>{' '}
            <span className={matches ? 'ok' : 'bad'}>{matches ? '✓' : '✗'}</span>
          </>
        )}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Knee angle over time, ${reps} reps`}>
        <line className="threshold up" x1={0} x2={W} y1={y(UP_DEG)} y2={y(UP_DEG)} />
        <line className="threshold down" x1={0} x2={W} y1={y(DOWN_DEG)} y2={y(DOWN_DEG)} />
        <text className="label up" x={4} y={y(UP_DEG) - 4}>
          {UP_DEG}° back up
        </text>
        <text className="label down" x={4} y={y(DOWN_DEG) + 14}>
          {DOWN_DEG}° deep enough
        </text>
        {segments.map((points, i) => (
          <polyline key={i} className="signal" points={points} />
        ))}
        {repEndFrames.map((frame) => (
          <circle key={frame} className="rep" cx={x(frame)} cy={y(angles[frame] ?? UP_DEG)} r={5} />
        ))}
      </svg>
    </section>
  );
}

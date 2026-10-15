import type { StoredSession } from '@rep-counter/core';

interface Props {
  sessions: StoredSession[];
  loading: boolean;
  error?: string;
}

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function SessionsList({ sessions, loading, error }: Props) {
  if (error)
    return (
      <p className="error" role="alert">
        Could not load sessions: {error}
      </p>
    );
  if (!sessions.length) return <p className="muted">{loading ? 'Loading…' : 'No sessions yet.'}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Performed</th>
          <th>Reps</th>
          <th>Duration</th>
          <th>Session</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.sessionId}>
            <td>{when.format(new Date(s.performedAt))}</td>
            <td className="num">{s.reps}</td>
            <td className="num">{s.durationSec.toFixed(1)} s</td>
            <td className="mono">{s.sessionId.slice(0, 8)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

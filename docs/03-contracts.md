# 03 — Contracts

## Rep counter

Two states, one pass over the angles.

| State | Moves when | To |
|---|---|---|
| `UP` (start) | 3 frames in a row < 100° | `DOWN` |
| `DOWN` | 3 frames in a row > 160° | `UP`, reps + 1 |

- 3 frames = 100 ms at 30 Hz: ignores one-frame glitches, never a real squat.
- A frame that isn't a number resets the streak.
- Output: `reps`, plus the frame where each rep finished (for the chart).
- Must give: clean = 10, noisy = 8, shallow = 7.

## Session

What the browser sends. One shared schema for web and API.

| Field | Type | Rule |
|---|---|---|
| `sessionId` | string | UUID, made once per analysis |
| `reps` | integer | 0 – 1000 |
| `durationSec` | number | > 0, ≤ 86400 (`angles.length / sampleRateHz`) |
| `performedAt` | string | ISO 8601 with timezone |

Any other field (e.g. `angles`) → **400**.

## API

All requests: `Authorization: Bearer <token>`. Tokens: `alice-token`, `bob-token` (overridable by env).

**POST /sessions** — body: Session

| Case | Status | Body |
|---|---|---|
| new `sessionId` | 201 | stored session |
| same `sessionId`, same user, same data | 200 | stored session |
| same `sessionId`, other data or other user | 409 | error |
| invalid or extra fields | 400 | error |
| missing / unknown token | 401 | error |

"Same data" compares `performedAt` as a moment in time, not as text.

**GET /sessions**

| Case | Status | Body |
|---|---|---|
| ok | 200 | `{ "items": StoredSession[] }`, newest `performedAt` first |
| missing / unknown token | 401 | error |

`StoredSession` = Session + `createdAt`. Error = `{ "error": "conflict", "message": "…" }`.

## Table

```sql
CREATE TABLE sessions (
  session_id    TEXT    PRIMARY KEY,
  user_id       TEXT    NOT NULL,
  reps          INTEGER NOT NULL,
  duration_sec  REAL    NOT NULL,
  performed_at  INTEGER NOT NULL,  -- epoch ms
  created_at    INTEGER NOT NULL   -- epoch ms
);
CREATE INDEX sessions_user_time ON sessions (user_id, performed_at DESC);
```

Save = `INSERT … ON CONFLICT (session_id) DO NOTHING`; if nothing was inserted, read the row and compare → 200 or 409.

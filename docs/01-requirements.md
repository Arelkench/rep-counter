# 01 — Requirements

## Requirements

**Rep counter**
- `countReps(angles)` in TypeScript.
- One rep = angle goes below 100°, then back above 160°. Nothing else counts.
- Tested on the fixtures: clean = 10, noisy = 8, shallow = 7.

**Backend**
- `POST /sessions` saves `{ sessionId, reps, durationSec, performedAt }`.
- The same `sessionId` sent twice is saved once.
- `GET /sessions` returns only the caller's sessions.
- Every request needs a token (hard-coded per user).

**Frontend**
- Pick a fixture, count reps in the browser.
- Send only the result, never the angles.
- Show the list of sessions.

**Delivery**
- Starts with one command; README with assumptions; `CLAUDE.md`; note on one AI mistake; git history as is.

## Assumptions

- `sessionId` is a UUID created once per analysis, so a retry reuses it.
- `durationSec = angles.length / sampleRateHz`; `performedAt` = time of analysis.
- Users: `alice` and `bob`, each with a fixed token.

## Later improvements

**In v1**
- API: 201 first save / 200 repeat / 409 conflict; reject bad input and extra fields like `angles`; newest first.
- Counter: ignore one-frame glitches; chart with threshold lines; "counted X, expected Y".
- Quality: API tests (duplicate, isolation, 401), test that angles are never sent, CI, Docker.

**After v1**
- Auto-retry and offline queue, pagination, JWT login, Postgres.

## Technology

| Choice | Why |
|---|---|
| npm workspaces monorepo with a shared `core` package | Counter runs in the browser and is tested alone; request schema shared by web and API. |
| NestJS | Required. Guard for tokens, pipe for validation. |
| React + Vite | Required. Vite is the fastest standard setup, with a proxy to the API. |
| Zod | One strict schema rejects extra fields like `angles`, used on both sides. |
| SQLite + Drizzle | Required storage; primary key on `sessionId` makes "saved once" a database guarantee. |
| Vitest + Supertest | Fast unit tests and real HTTP tests for the API. |
| Docker Compose + GitHub Actions | One command to run, tests on every push. |

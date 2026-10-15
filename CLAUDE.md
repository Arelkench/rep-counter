# Rep Counter

Counts squats from knee angles in the browser, saves only the result to a NestJS API, lists each user's sessions.

Read first: `docs/01-requirements.md`, `docs/design.excalidraw`, `docs/03-contracts.md`, `docs/04-interfaces.md`.

## Layout

```
packages/core   Rep counter + Session schema (pure TS)
apps/web        React + Vite
apps/api        NestJS + SQLite
fixtures/       session-clean / noisy / shallow (10 / 8 / 7 reps)
```

## Commands

```
npm run dev        # web + api
npm test           # all tests
docker compose up  # everything, no Node needed
```

## Rules

- Angles never leave the browser. Only `Session` (4 fields) is sent.
- `packages/core` imports nothing from React, Nest or the network.
- Only the API client calls `fetch`. Only the Controller knows HTTP status codes.
- Only `SessionStore` touches the database.
- The Session schema lives in `core`; never redefine it in web or api.
- Every change comes with a test. Fixtures must stay at 10 / 8 / 7.
- Keep docs short: requirements, decisions, interfaces. No essays.
- Commit messages: plain, no AI co-author lines.
- When the design changes, update `docs/` and the diagram in the same commit.

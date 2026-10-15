# 02 — Architecture

Diagram: [design.excalidraw](design.excalidraw). Angles never leave the browser; only a `session` (4 fields) crosses the network.

## Browser (React)

| Layer | Part | Job |
|---|---|---|
| UI | File picker | loads a fixture JSON |
| UI | Analysis view | chart, counted vs expected |
| UI | Sessions list | my sessions, newest first |
| UI | User switcher | alice / bob → token |
| Logic | Result builder | angles → reps (via Rep counter) + sessionId, durationSec, performedAt |
| Logic | Session sync | save the session, then reload the list |
| Core & data | Rep counter | below 100°, then above 160° = 1 rep |
| Core & data | API client | adds Bearer token; the only part that talks to the server |

## Server (NestJS)

| Layer | Part | Job |
|---|---|---|
| HTTP | Auth guard | token → userId, else **401** |
| HTTP | Validator | body is exactly `sessionId`, `reps`, `durationSec`, `performedAt`, else **400** |
| HTTP | Controller | new → **201**, same again → **200**, same id + other data → **409**, GET → my list |
| HTTP | Error filter | every error leaves as `{ error, message }`; 500s are logged, details hidden |
| Logic | Session service | saves each session once, lists only the user's own |
| Data | Database access | adds a row only if `sessionId` is new, reads rows by `userId` |

## Database (SQLite)

`sessions` table = rows of the **Session** entity:
`sessionId` (UUID, primary key), `userId`, `reps`, `durationSec`, `performedAt`, `createdAt`.
Index on `userId + performedAt`.

## Key decisions

| Decision | Why |
|---|---|
| Shared `core` package (Rep counter + session schema) | Runs in the browser, tested alone; web and API use one schema. |
| Primary key on `sessionId` | "Saved once" is guaranteed by the database, so concurrent retries can't both insert. |
| Service answers new / repeat / clash; Controller maps to 201 / 200 / 409 | HTTP stays out of the logic. |
| Web calls the API through a proxy at `/api` | Same origin, no CORS. |
| Database access behind an interface | Postgres later touches one class. |

## Layout

```
packages/core   Rep counter + session schema
apps/web        React + Vite
apps/api        NestJS
fixtures/       test data
docs/           these docs
```

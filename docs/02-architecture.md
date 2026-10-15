# 02 — Architecture

## Overview

System design diagram: [design.excalidraw](design.excalidraw) (open in excalidraw.com or the Excalidraw editor extension).

Angles never leave the browser. Only the 4-field result crosses the network.

## Parts

| Part | Does | Doesn't |
|---|---|---|
| `packages/core` | Counts reps; defines the result schema. Pure TypeScript. | Know about React, Nest or HTTP. |
| `apps/web` | Loads a fixture, runs `core`, sends the result, shows the list. | Send angles. |
| `apps/api` | Checks the token, validates, saves once, lists the caller's sessions. | Know about angles. |
| SQLite | Stores sessions. `sessionId` is the primary key. | — |

## Saving a session

1. Guard maps the token to a user, or returns **401**.
2. Validation accepts exactly the 4 fields, or returns **400** (so `angles` is rejected).
3. Insert; if the `sessionId` already exists, nothing is inserted.
4. If it was inserted → **201**. If it existed with the same user and data → **200**. Otherwise → **409**.

The database primary key decides "first or repeat", so two retries arriving at the same time can't both insert.

## Key decisions

| Decision | Why |
|---|---|
| Shared `core` package | The counter runs in the browser and is tested on its own; web and API use one schema. |
| Primary key on `sessionId` | "Saved once" is guaranteed by the database, not by app code. |
| Service returns `created / replayed / conflict`, controller maps to 201/200/409 | HTTP stays out of the logic, which keeps it easy to test. |
| Web calls the API through a proxy at `/api` | Same origin, so no CORS setup. |
| Repository interface in front of SQLite | Switching to Postgres later touches one class. |

## Layout

```
packages/core   counter + schema
apps/api        NestJS
apps/web        React + Vite
fixtures/       test data
docs/           these docs
```

# 01 — Requirements and framing

> Iteration 0.1. No code. This document fixes **what** we build and **why**, so every later decision (architecture, contracts, interfaces) can point back to a line here.

## 1. Problem

A patient does squats in front of a camera. The browser turns the video into one number per frame: the knee angle (~172° standing, ~90° deep squat). We need to:

1. count the squats from that signal **in the browser**,
2. store **only the result** on a server, once, even when the device retries,
3. show each patient **only their own** session history.

## 2. Glossary

| Term | Meaning |
|---|---|
| **Frame / sample** | One knee angle in degrees. Fixtures are sampled at 30 Hz. |
| **Rep** | Angle goes **below 100°**, then comes back **above 160°**. Nothing else counts. |
| **Session** | One analysed recording → one result `{ sessionId, reps, durationSec, performedAt }`. |
| **Session result** | The only data that leaves the browser. Never contains angles. |
| **Replay** | The same `sessionId` arriving again (device retry). |
| **User** | Identified by a bearer token. Hard-coded token → user map. |

## 3. Goals

| ID | Goal | Source |
|---|---|---|
| G1 | Count reps exactly per the rule; fixtures give clean = 10, noisy = 8, shallow = 7. | Brief |
| G2 | Each session is saved once, however many times it is posted. | Brief |
| G3 | Angles never leave the browser. | Brief |
| G4 | A user only ever sees their own sessions. | Brief |
| G5 | A reviewer starts everything with one command and can verify G1–G4 from tests. | Brief + quality |

## 4. Functional requirements

### Must (brief)

| ID | Requirement |
|---|---|
| FR-1 | `countReps(angles)` in TypeScript implementing the rep rule. |
| FR-2 | Tests for `countReps` against the 3 fixtures. |
| FR-3 | `POST /sessions` stores `{ sessionId, reps, durationSec, performedAt }`. |
| FR-4 | Posting an existing `sessionId` does not create a second row. |
| FR-5 | `GET /sessions` returns the caller's sessions. |
| FR-6 | Every request needs a token; missing/unknown token is rejected. |
| FR-7 | Frontend: pick a fixture, count in the browser, send only the result, show the list. |

### Should (selected nice-to-haves)

| ID | Requirement | Group |
|---|---|---|
| FR-8 | `201` on first save, `200` on identical replay. | Strict API |
| FR-9 | `409` when the same `sessionId` comes with different data or from another user. | Strict API |
| FR-10 | Validate input; reject bad values and **any extra field** (e.g. `angles`) with `400`. | Strict API |
| FR-11 | List sorted newest first. | Strict API |
| FR-12 | Ignore one-frame glitches (N consecutive frames past a threshold). | Signal UX |
| FR-13 | Chart of the angles with both threshold lines and rep markers. | Signal UX |
| FR-14 | Show "counted X, expected Y" when the file declares `expectedReps`. | Signal UX |
| FR-15 | API tests: duplicate → one row, user isolation, missing token → 401. | Quality |
| FR-16 | A test proving angles are never sent. | Quality |
| FR-17 | Tests run on GitHub Actions. | Quality |
| FR-18 | Everything also runs with Docker. | Quality |

### Deferred (documented in README "What's next")

Auto-retry with the same `sessionId`, offline outbox, pagination, real login (JWT/OAuth), Postgres.
**Why deferred:** each is valuable but none changes the core guarantees G1–G4; the design keeps a seam for each (see §7).

## 5. Assumptions (and why)

| # | Assumption | Why this and not the alternative |
|---|---|---|
| A1 | Thresholds are **strict**: armed at `< 100`, completed at `> 160`. | The brief says "below" and "above". Equality is a measure-zero edge in real data; strictness is the literal reading. |
| A2 | A recording that **starts below 100°** is armed immediately. | "Goes below 100°" is satisfied by being below. Requiring a prior >160° would silently drop a valid first rep. |
| A3 | A rep needs **both** crossings; ending in the squat does not count. | "then comes back above 160°" — incomplete reps are not reps. |
| A4 | Debounce: a crossing counts after **3 consecutive frames** past the line (100 ms @ 30 Hz). | Kills one-frame tracking glitches (noisy fixture peaks at 181.6°, physically impossible). 100 ms is far shorter than any real squat phase, so no true rep is lost. A plain state machine already gives 10/8/7, so this is margin, not a fit to the data. |
| A5 | Non-finite samples (`NaN`, `null`) are ignored and break a debounce streak. | Pose trackers drop frames. Treating a gap as "past the line" would invent crossings. |
| A6 | `sessionId` is a **UUID v4 generated once per analysis**, by the client. | An idempotency key identifies the *attempt*, not the content. A content hash would merge two genuine sessions that happen to produce identical files. |
| A7 | `durationSec = angles.length / sampleRateHz`. | Fixtures have no timestamps; the sample rate is the only clock. |
| A8 | `performedAt` = time of analysis, ISO-8601 with offset, stored as UTC. | Fixtures carry no recording time. A real device would send recording start; the field's meaning is unchanged. |
| A9 | Identity = hard-coded `token → userId` map (`alice`, `bob`), overridable by env. No users table. | Allowed by the brief. Keeping auth behind one guard means JWT later replaces one class. |
| A10 | `sessionId` is **globally** unique, not per user. | Needed for FR-9: a different user reusing an id must be detected, not silently stored. |
| A11 | Replay equality compares canonical values (timestamp → epoch ms). | `2026-10-15T10:00:00Z` and `2026-10-15T12:00:00+02:00` are the same instant; a string compare would wrongly return 409. |
| A12 | 409 for another user's id is acceptable even though it reveals that the id exists. | Ids are unguessable UUIDs and the brief asks for 409. Noted as a trade-off. |

## 6. Non-goals

- Video capture or pose estimation (input is already angles).
- Real authentication, user management, multi-device sync.
- Offline outbox / background retry (deferred, §4).
- Editing or deleting sessions.

## 7. Quality attributes (ranked)

When two of these conflict, the higher one wins.

1. **Correctness.** Count matches the rule; idempotency holds under concurrent retries. *Why first:* a wrong count or a duplicate row is a clinical-data bug.
2. **Privacy.** Angles never leave the browser, enforced in three layers: type, client test, server rejection. *Why:* the brief's one explicit privacy rule. Defence in depth means a single mistake can't leak data.
3. **Clarity and testability.** Pure core, thin adapters, every guarantee has a named test. *Why:* the deliverable is judged on reasoning as much as on output.
4. **Evolvability.** Seams for the deferred items: response envelope `{ items }` for pagination, repository port for Postgres, one guard for JWT, a step-wise algorithm for live streaming.
5. **Performance.** O(n) time, O(1) memory, one pass. That is the lower bound: every sample must be read. *Why last:* already optimal; a 36 s session is ~1,100 samples.

## 8. Constraints

- Node + TypeScript backend (NestJS), React + TypeScript frontend.
- Storage: SQLite (Drizzle + better-sqlite3).
- Starts with one command: `npm run dev` (local) and `docker compose up` (no Node needed).
- Git history kept as is; it should show design → interfaces → code → refinement.
- Deliver `CLAUDE.md`/`AGENTS.md` and a note on one AI mistake.

## 9. Fixtures (verified)

| File | Frames | Duration | Min / max angle | Expected | Plain state machine |
|---|---|---|---|---|---|
| `session-clean.json` | 1088 | 36.3 s | 89.3° / 174.6° | 10 | 10 |
| `session-noisy.json` | 828 | 27.6 s | 85.7° / 181.6° | 8 | 8 |
| `session-shallow.json` | 1080 | 36.0 s | 87.7° / 175.6° | 7 | 7 |

Shape: `{ description, expectedReps, sampleRateHz, angles: number[] }`.

## 10. Traceability

Each requirement maps to where it is designed and how it is proven. The design docs are filled in during iterations 0.2–0.4; the tests in iteration 1+.

| Req | Designed in | Proven by |
|---|---|---|
| FR-1, FR-12, A1–A5 | `03-rep-algorithm.md` | core unit tests (fixtures + edge cases) |
| FR-2 | `03-rep-algorithm.md` | `core` fixture table test |
| FR-3, FR-8, FR-9, FR-10 | `04-api-contract.md` | API e2e: 201 / 200 / 409 / 400 |
| FR-4, A10, A11 | `05-data-model.md`, ADR-0003 | API e2e: duplicate post → 1 row |
| FR-5, FR-11 | `04-api-contract.md` | API e2e: list order |
| FR-6, G4 | `02-architecture.md` (guard) | API e2e: 401; Alice can't see Bob's sessions |
| FR-7, FR-13, FR-14 | `06-interfaces.md` (web) | web component tests |
| FR-16, G3 | `02-architecture.md` (3 layers) | web test on request body + API 400 on `angles` |
| FR-17, FR-18 | `02-architecture.md` (ops) | CI run, `docker compose up` |

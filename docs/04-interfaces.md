# 04 — Interfaces

One block per part of the diagram. Names may change in code; the shapes and boundaries don't.

## Core (`packages/core`)

```ts
// Rep counter
export const DOWN_DEG = 100, UP_DEG = 160, FRAMES = 3;

export type Phase = 'UP' | 'DOWN';
export interface RepState { phase: Phase; streak: number; reps: number }

export function step(state: RepState, angle: number | null): RepState;   // one frame, pure; null = dropped frame
export function countReps(angles: ArrayLike<number | null>): number;
export function analyzeReps(angles: ArrayLike<number | null>): { reps: number; repEndFrames: number[] };

// Session schema (shared by web and API)
export const SessionSchema;                                          // zod, .strict()
export type Session = { sessionId: string; reps: number; durationSec: number; performedAt: string };
export type StoredSession = Session & { createdAt: string };

export const FixtureSchema;                                          // zod
export type Fixture = { description?: string; expectedReps?: number; sampleRateHz: number; angles: (number | null)[] };
```

## Browser (`apps/web`)

```ts
// Result builder — also returns the analysis for the chart
function buildSession(fixture: Fixture, now: Date, newId: () => string): { session: Session; analysis: RepAnalysis };

// API client — the only code that calls fetch
interface ApiClient {
  save(session: Session): Promise<{ status: 201 | 200; session: StoredSession }>;
  list(): Promise<StoredSession[]>;
}
function createApiClient(token: string, baseUrl?: string, fetchFn?: typeof fetch): ApiClient;

// Session sync
function useSessions(api: ApiClient): {
  sessions: StoredSession[]; save(session: Session): Promise<201 | 200>; error?: string; loading: boolean;
};

// UI
App            { createApi?: (token: string) => ApiClient }   // swap in a fake server for tests
FilePicker     { onLoad(name: string, fixture: Fixture): void; onError(message: string): void }
AnalysisView   { angles: (number | null)[]; reps: number; repEndFrames: number[]; expectedReps?: number }
SessionsList   { sessions: StoredSession[]; loading: boolean; error?: string }
UserSwitcher   { user: 'alice' | 'bob'; onChange(user: 'alice' | 'bob'): void }
```

## Server (`apps/api`)

```ts
// Auth guard
const TOKENS: Record<string, string>;                    // token -> userId
class AuthGuard implements CanActivate {}                 // sets request.userId, else 401

// Validator
class ZodValidationPipe { constructor(schema: ZodSchema) }   // 400 on any mismatch

// Controller
@Post('/sessions') save(userId: string, body: Session): StoredSession;          // 201 | 200 | 409
@Get('/sessions')  list(userId: string): { items: StoredSession[] };

// Session service
type SaveOutcome =
  | { kind: 'created'; session: StoredSession }
  | { kind: 'replayed'; session: StoredSession }
  | { kind: 'conflict' };
class SessionService {
  save(userId: string, session: Session): Promise<SaveOutcome>;
  list(userId: string): Promise<StoredSession[]>;
}

// Database access
type SessionRow = {
  sessionId: string; userId: string; reps: number; durationSec: number;
  performedAt: number; createdAt: number;                // epoch ms
};
interface SessionStore {
  insertIfNew(row: SessionRow): Promise<boolean>;         // false = sessionId already exists
  findById(sessionId: string): Promise<SessionRow | undefined>;
  listByUser(userId: string): Promise<SessionRow[]>;      // newest performedAt first
}
```

`SessionStore` is async even though SQLite is sync, so a Postgres version fits the same interface.

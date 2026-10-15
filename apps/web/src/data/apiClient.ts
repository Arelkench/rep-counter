import { SessionListSchema, SessionSchema, StoredSessionSchema, type Session, type StoredSession } from '@rep-counter/core';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiClient {
  save(session: Session): Promise<{ status: 201 | 200; session: StoredSession }>;
  list(): Promise<StoredSession[]>;
}

/** The only code in the browser that talks to the server. */
export function createApiClient(
  token: string,
  baseUrl = '/api',
  fetchFn: typeof fetch = (...args) => fetch(...args),
): ApiClient {
  async function call(path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (init.body) headers['Content-Type'] = 'application/json';
    const res = await fetchFn(`${baseUrl}${path}`, { ...init, headers });
    const body: unknown = await res.json().catch(() => undefined);
    if (!res.ok) throw new ApiError(res.status, serverMessage(body) ?? `Request failed (${res.status})`);
    return { status: res.status, body };
  }

  return {
    async save(session) {
      // Re-parse with the strict schema: exactly the 4 fields go out, anything else (angles) throws here.
      const payload = SessionSchema.parse(session);
      const { status, body } = await call('/sessions', { method: 'POST', body: JSON.stringify(payload) });
      return { status: status === 201 ? 201 : 200, session: StoredSessionSchema.parse(body) };
    },
    async list() {
      const { body } = await call('/sessions');
      return SessionListSchema.parse(body).items;
    },
  };
}

function serverMessage(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') return body.message;
  return undefined;
}

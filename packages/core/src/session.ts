import { z } from 'zod';

/** The only data that leaves the browser. Strict: any extra field (e.g. `angles`) is rejected. */
export const SessionSchema = z.strictObject({
  sessionId: z.uuid(),
  reps: z.int().min(0).max(1000),
  durationSec: z.number().positive().max(86_400),
  performedAt: z.iso.datetime({ offset: true }),
});
export type Session = z.infer<typeof SessionSchema>;

export const StoredSessionSchema = SessionSchema.extend({
  createdAt: z.iso.datetime({ offset: true }),
});
export type StoredSession = z.infer<typeof StoredSessionSchema>;

export const SessionListSchema = z.object({ items: z.array(StoredSessionSchema) });

import { z } from 'zod';

/** A recorded session file: knee angles per frame. `null` = frame the tracker dropped. */
export const FixtureSchema = z.object({
  description: z.string().optional(),
  expectedReps: z.int().min(0).optional(),
  sampleRateHz: z.number().positive(),
  angles: z.array(z.number().nullable()).min(1),
});
export type Fixture = z.infer<typeof FixtureSchema>;

/** Demo users with the server's hard-coded tokens. Not secret: they exist only for this exercise. */
export const USERS = {
  alice: 'alice-token',
  bob: 'bob-token',
} as const;

export type User = keyof typeof USERS;

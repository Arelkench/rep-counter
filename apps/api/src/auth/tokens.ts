/** token -> userId. Hard-coded per the brief; override with AUTH_TOKENS="token:user,token:user". */
export type TokenMap = Readonly<Record<string, string>>;

export const TOKENS = Symbol('TOKENS');

export const DEFAULT_TOKENS: TokenMap = {
  'alice-token': 'alice',
  'bob-token': 'bob',
};

export function loadTokens(raw = process.env.AUTH_TOKENS): TokenMap {
  if (!raw) return DEFAULT_TOKENS;
  return Object.fromEntries(
    raw.split(',').map((pair) => {
      const [token, userId] = pair.split(':').map((s) => s.trim());
      if (!token || !userId) throw new Error(`AUTH_TOKENS: bad entry "${pair}", expected token:user`);
      return [token, userId];
    }),
  );
}

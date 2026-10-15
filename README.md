# rep-counter

Counts squats from knee angles in the browser, saves only the result to a NestJS API, lists each user's sessions.

## Run

```bash
npm install
npm run dev     # web on http://localhost:5173, API on :3000
npm test        # core, api and web tests
```

Users: pick **alice** or **bob** in the top right (tokens `alice-token`, `bob-token`).
Env: `API_PORT` (default 3000), `DB_PATH` (default `apps/api/data/rep-counter.sqlite`), `AUTH_TOKENS="token:user,…"`.

## Docs

Requirements, design diagram, contracts and interfaces live in [`docs/`](docs/). Agent rules: [`CLAUDE.md`](CLAUDE.md).

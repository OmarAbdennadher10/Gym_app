# Gym AI Coach — Backend

Node.js/Express proxy + database. Handles auth, stores users/profiles/plans,
and is the only thing that talks to the LLM API (the API key never touches
the Flutter client).

## Stack
- Express — HTTP API
- Prisma + Supabase-hosted PostgreSQL — database (always-on, no local file)
- JWT — auth
- Zod — request & AI-response validation
- Kimi (Moonshot AI) — LLM provider, called via an OpenAI-compatible
  `/chat/completions` endpoint in `src/services/llm.js`. Swappable: point
  `LLM_BASE_URL`/`LLM_MODEL` at any other OpenAI-compatible provider
  (OpenAI itself, DeepSeek, etc.) without touching route code.

## Endpoints

| Method | Path              | Auth | Purpose                              |
|--------|-------------------|------|---------------------------------------|
| POST   | /auth/register    | no   | Create account, returns JWT           |
| POST   | /auth/login       | no   | Log in, returns JWT                   |
| POST   | /profile          | yes  | Save a profile snapshot               |
| GET    | /profile/latest   | yes  | Get the user's most recent profile    |
| POST   | /plan/generate    | yes  | Compute macros, call the LLM, validate, store, return plan |
| POST   | /plan/regenerate-meals | yes | Rebuild only the meal plan around the current grocery list + excluded ingredients |
| GET    | /plan/active      | yes  | Get the user's current active plan    |
| GET    | /plan/history     | yes  | List past plans                       |
| POST   | /session          | yes  | Start/save a workout session (weights/reps per set) |
| PATCH  | /session/:id      | yes  | Update an in-progress session or mark complete |
| GET    | /session          | yes  | Full session history                  |
| GET    | /session/by-day/:dayLabel | yes | Session history filtered to one training day |
| GET    | /grocery          | yes  | List shopping list items              |
| POST   | /grocery          | yes  | Add a manual item                     |
| POST   | /grocery/generate-from-meal-plan | yes | Pull ingredients from the active meal plan |
| PATCH  | /grocery/:id      | yes  | Update/check an item                  |
| DELETE | /grocery/:id      | yes  | Remove one item                       |
| DELETE | /grocery          | yes  | Clear all checked items               |
| GET    | /excluded-ingredients | yes | List foods the user always wants avoided in meal plans |
| POST   | /excluded-ingredients | yes | Add an excluded ingredient            |
| DELETE | /excluded-ingredients/:id | yes | Remove an excluded ingredient   |
| POST   | /weight-log       | yes  | Log a bodyweight entry                |
| GET    | /weight-log       | yes  | List weight entries                   |
| GET    | /health           | no   | Liveness check                        |

All authenticated routes expect `Authorization: Bearer <token>`.

## Setup

```bash
cd gym_ai_backend
npm install
cp .env.example .env
```

Create a project at supabase.com, then from **Settings → Database → Connection
string** copy both the pooled (port 6543) and direct (port 5432) URIs into
`.env` as `DATABASE_URL` and `DIRECT_URL`. Also set `LLM_API_KEY` and
`JWT_SECRET`.

```bash
npx prisma migrate dev --name init   # creates tables in Supabase
npm run dev                          # starts on http://localhost:3000
```

Test it:
```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

`npx prisma studio` browses the live Supabase data — handy for confirming
rows land correctly while testing.

## Production

The database is already hosted (Supabase) regardless of dev/prod. What's
still local is the Express process itself — while you run it with
`npm run dev`, the API goes down whenever that terminal closes. To make the
whole backend always-on, not just the database:

1. Push this repo to GitHub (already `.gitignore`d: `node_modules`, `.env`).
2. Create a project on Railway/Render/Fly.io, point it at the repo.
3. Set the same env vars there as in your local `.env` (`DATABASE_URL`,
   `DIRECT_URL`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `JWT_SECRET`) —
   same Supabase project, no separate production database needed.
4. Build/start commands:
   - Build: `npm install && npx prisma generate`
   - Start: `npm start`
   (skip `prisma migrate deploy` in the build step unless you've already run
   `migrate dev` locally against Supabase at least once, which you will have
   by this point — the tables already exist.)
5. Set `JWT_SECRET` to a real random value (`openssl rand -hex 32`), not
   the placeholder.
6. Set `CORS_ORIGIN` to your actual origins if you ever add a web client —
   native Flutter HTTP calls aren't subject to CORS, so `*` is fine for
   mobile-only.
7. Deploy. You get a stable HTTPS URL — put that into `kBackendBaseUrl` in
   the Flutter app instead of an ngrok tunnel, and you never need to keep
   your PC running or restart a tunnel again.

See the root-level `LINKING_GUIDE.md` for how to connect this to the
Flutter app end-to-end.

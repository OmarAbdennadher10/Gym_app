# Gym AI Coach — Backend

Node.js/Express proxy + database. Handles auth, stores users/profiles/plans,
and is the only thing that talks to the LLM API (the API key never touches
the Flutter client).

## Stack
- Express — HTTP API
- Prisma + SQLite (dev) / PostgreSQL (prod) — database
- JWT — auth
- Zod — request & AI-response validation
- Groq — LLM provider, called via an OpenAI-compatible
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
| POST   | /plan/generate    | yes  | Compute macros, call Groq, validate, store, return plan |
| GET    | /plan/active      | yes  | Get the user's current active plan    |
| GET    | /plan/history     | yes  | List past plans                       |
| POST   | /weight-log       | yes  | Log a bodyweight entry                |
| GET    | /weight-log       | yes  | List weight entries                   |
| GET    | /health           | no   | Liveness check                        |

All authenticated routes expect `Authorization: Bearer <token>`.

## Local setup

```bash
cd gym_ai_backend
npm install
cp .env.example .env
# edit .env: set LLM_API_KEY and JWT_SECRET at minimum
npx prisma migrate dev --name init   # creates dev.db and applies schema
npm run dev                          # starts on http://localhost:3000
```

Test it:
```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Production

1. Switch `prisma/schema.prisma` datasource provider to `"postgresql"`.
2. Set `DATABASE_URL` to a managed Postgres instance (Railway, Supabase,
   Neon, or RDS all work fine).
3. Run `npx prisma migrate deploy` against that database.
4. Deploy the Node app anywhere that runs Node 18+ (Railway, Render,
   Fly.io, a plain VM). Set the same env vars there.
5. Set `JWT_SECRET` to a real random value (`openssl rand -hex 32`), not
   the placeholder.
6. Set `CORS_ORIGIN` to your actual origins if you ever add a web client —
   native Flutter HTTP calls aren't subject to CORS, so `*` is fine for
   mobile-only.

See the root-level `LINKING_GUIDE.md` for how to connect this to the
Flutter app end-to-end.

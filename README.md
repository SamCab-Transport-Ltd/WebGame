# WebGame

Persistent browser-based async MMO strategy game (post-war rebuilding). MVP target: 50–200 CCU.

See [docs/MVP_PLAN.md](docs/MVP_PLAN.md) for the full architecture, schema, tick simulation design, and phased roadmap.

## Stack

- **Frontend:** Next.js 14, React, TypeScript, TailwindCSS
- **Backend:** NestJS, TypeScript, Socket.IO
- **DB:** PostgreSQL (Prisma)
- **Cache/Realtime:** Redis, Socket.IO
- **Deploy:** Docker → Fly.io / Railway

## Layout

```
apps/
  api/        NestJS backend (REST + WS + tick scheduler)
  web/        Next.js 14 frontend
packages/
  shared/     Shared TS types (DTOs, enums, constants)
prisma/       schema.prisma + migrations (consumed by api)
docker/       docker-compose for local Postgres + Redis
docs/         Architecture and design docs
```

## Local development

Prereqs: Node 20+, pnpm 9+, Docker.

```bash
cp .env.example .env
pnpm install
pnpm docker:up                  # postgres + redis
pnpm --filter @webgame/api prisma:migrate   # apply initial migration
pnpm dev                        # api on :4000, web on :3000
```

## Scripts

- `pnpm dev` — run api + web in parallel
- `pnpm build` — build api + web
- `pnpm lint` — lint all packages
- `pnpm typecheck` — typecheck all packages
- `pnpm test` — run unit tests
- `pnpm docker:up` / `pnpm docker:down` — local Postgres + Redis

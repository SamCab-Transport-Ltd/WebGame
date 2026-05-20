# WebGame — MVP Architecture & Roadmap

Persistent browser-based async MMO strategy game (post-war rebuilding).
Target: 50–200 CCU, desktop-first, fast deploy, cheap infra.

---

## 1. High-Level Architecture

```
                     ┌─────────────────────────────┐
                     │       Browser (Next.js)     │
                     │  React + Tailwind + Zustand │
                     │  REST + Socket.IO client    │
                     └──────────────┬──────────────┘
                                    │ HTTPS / WSS
                                    ▼
                     ┌─────────────────────────────┐
                     │      API (NestJS, TS)       │
                     │  REST + Socket.IO gateway   │
                     │  JWT auth, modular DI       │
                     └──────┬───────────────┬──────┘
                            │               │
                ┌───────────▼───┐     ┌─────▼──────┐
                │  PostgreSQL   │     │   Redis    │
                │  (Prisma)     │     │  pub/sub,  │
                │  game state   │     │  locks,    │
                │               │     │  socket bus│
                └───────────────┘     └────────────┘
                            ▲
                            │ scheduled / cron
                     ┌──────┴──────────────┐
                     │  Simulation Worker  │
                     │  (NestJS @Cron jobs)│
                     │  tick = 30s         │
                     └─────────────────────┘
```

Monorepo layout (pnpm workspaces):

```
WebGame/
├── apps/
│   ├── api/           # NestJS backend (REST + WS + simulation)
│   └── web/           # Next.js 14 App Router frontend
├── packages/
│   ├── shared/        # shared TS types (DTOs, enums, constants)
│   └── config/        # tsconfig + eslint base
├── prisma/            # schema.prisma + migrations (used by api)
├── docker/
│   ├── docker-compose.yml         # local dev: pg, redis, api, web
│   └── docker-compose.prod.yml
├── docs/
│   └── MVP_PLAN.md
├── .github/workflows/ci.yml
├── package.json (root, workspace + scripts)
└── pnpm-workspace.yaml
```

Why monorepo: shared types between API and Web eliminate drift on game DTOs; deploy each app independently.

Why one NestJS process for API + simulation in MVP: at 50–200 CCU a single process with `@nestjs/schedule` is more than enough. We architect the simulation module so it can be extracted into a dedicated worker later (separate Dockerfile target) without code changes.

---

## 2. Backend Modules (NestJS)

Each module is a folder under `apps/api/src/modules/<name>` containing `*.module.ts`, `*.controller.ts` (if HTTP), `*.service.ts`, `*.gateway.ts` (if WS), DTOs, and unit tests.

| Module          | Responsibility                                                                 |
|-----------------|--------------------------------------------------------------------------------|
| `auth`          | register, login, JWT issue + refresh, password hashing (argon2), guards.       |
| `users`         | user profile, settings.                                                        |
| `towns`         | town CRUD (one per user at MVP), placement on world grid.                      |
| `buildings`     | construct / upgrade / repair, costs, durations, completion timers.             |
| `resources`     | resource balances (food/water/scrap/fuel), generation rates, caps.             |
| `population`    | civilians, happiness, hunger.                                                  |
| `combat`        | async raids: queue attack, resolve at arrival timestamp, produce report.       |
| `weather`       | global weather state + scheduled rotation, modifier lookup.                    |
| `alliances`     | create/join/leave, alliance chat (Socket.IO room).                             |
| `world`         | grid sectors, neighbor lookup, abandoned zone seeding.                         |
| `world-events`  | detect significant events from sim state, emit AI-narrated news.               |
| `simulation`    | tick loop: drives resources, building completion, combat, weather, happiness. |
| `realtime`      | central Socket.IO gateway, room management, auth middleware.                   |
| `common`        | prisma service, config, logging, exception filters, guards, interceptors.      |

Module dependency graph (no cycles):
`auth → users → towns → {buildings, resources, population, combat} → simulation → world-events → realtime`. `weather` and `alliances` are leaves consumed by `simulation` and `realtime`.

---

## 3. PostgreSQL Schema (Prisma)

Design notes:
- All economic values are `Int` (whole units) for determinism. No floats in persistent state.
- All timestamps are `DateTime @db.Timestamptz(3)`.
- Optimistic locking via `version Int @default(0)` on `Town` (incremented on tick) prevents lost updates if we ever shard the simulator.
- Soft-deletable rows use `deletedAt DateTime?`.
- Append-only event log (`WorldEvent`, `CombatReport`) — never mutated, easy to paginate.

```prisma
// prisma/schema.prisma (excerpt)

generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

enum BuildingType { HQ FARM WATER_PUMP SCRAP_YARD BARRACKS WALL }
enum ResourceKind { FOOD WATER SCRAP FUEL }
enum WeatherKind  { CLEAR RAIN HEATWAVE SNOW FOG }
enum CombatStatus { PENDING RESOLVED }
enum EventKind    { WEATHER SHORTAGE DISASTER RAID ECONOMY POLITICAL }
enum AttackType   { RAID SIEGE SCOUT }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  displayName   String
  createdAt     DateTime @default(now())
  refreshTokens RefreshToken[]
  town          Town?
  allianceId    String?
  alliance      Alliance? @relation(fields: [allianceId], references: [id])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  revokedAt DateTime?
  user      User     @relation(fields: [userId], references: [id])
  @@index([userId])
}

model Town {
  id           String   @id @default(cuid())
  userId       String   @unique
  name         String
  sectorX      Int
  sectorY      Int
  defenseRating Int     @default(0)
  population   Int      @default(10)
  happiness    Int      @default(70)
  hunger       Int      @default(0)
  lastTickAt   DateTime @default(now())
  version      Int      @default(0)
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
  resources    Resource[]
  buildings    Building[]
  outgoingAttacks Combat[] @relation("attacker")
  incomingAttacks Combat[] @relation("defender")
  @@unique([sectorX, sectorY])
  @@index([userId])
}

model Resource {
  id       String       @id @default(cuid())
  townId   String
  kind     ResourceKind
  amount   Int          @default(0)
  cap      Int          @default(1000)
  town     Town         @relation(fields: [townId], references: [id])
  @@unique([townId, kind])
}

model Building {
  id              String        @id @default(cuid())
  townId          String
  type            BuildingType
  level           Int           @default(1)
  hp              Int           @default(100)
  constructionEndsAt DateTime?  // null = idle, non-null = under construction/upgrade
  town            Town          @relation(fields: [townId], references: [id])
  @@index([townId])
  @@index([constructionEndsAt])
}

model Combat {
  id           String       @id @default(cuid())
  attackerTownId String
  defenderTownId String
  attackType   AttackType
  troopCount   Int
  arriveAt     DateTime
  resolvedAt   DateTime?
  status       CombatStatus @default(PENDING)
  reportJson   Json?        // casualties, loot, damage breakdown
  attacker     Town         @relation("attacker", fields: [attackerTownId], references: [id])
  defender     Town         @relation("defender", fields: [defenderTownId], references: [id])
  @@index([status, arriveAt])
  @@index([attackerTownId])
  @@index([defenderTownId])
}

model Alliance {
  id          String   @id @default(cuid())
  tag         String   @unique
  name        String
  createdAt   DateTime @default(now())
  members     User[]
}

model Weather {
  id          String      @id @default(cuid())
  kind        WeatherKind
  startedAt   DateTime
  endsAt      DateTime
  @@index([endsAt])
}

model WorldEvent {
  id          String     @id @default(cuid())
  kind        EventKind
  headline    String
  body        String
  sectorX     Int?
  sectorY     Int?
  createdAt   DateTime   @default(now())
  @@index([createdAt])
  @@index([kind, createdAt])
}
```

Migration plan: a single initial migration (`init`) creates all of the above. We never edit migrations after they ship; new changes get new migration files via `prisma migrate dev`.

---

## 4. Tick Simulation System

### Goals
- Server-authoritative: clients only display state.
- Deterministic: given the same input state and elapsed time, the result is the same.
- Catch-up safe: a town that hasn't been touched for 30 min still calculates correctly when next loaded (we compute deltas based on `lastTickAt`, not on wall-clock ticks).
- Cheap: O(N) per tick where N = active towns, not buildings.

### Tick Cadence
- `@Cron('*/30 * * * * *')` — every 30 s.
- Sub-jobs at different cadences share the tick worker:
  - `every 30s`  → resource generation + happiness/hunger drift + building completion check.
  - `every 60s`  → combat resolution sweep (`status=PENDING AND arriveAt <= now`).
  - `every 1h`   → weather rotation + world-event detection + AI narration.

### Resource Generation Formula (per tick, per town)
```ts
deltaT = now - town.lastTickAt  // seconds
for each ResourceKind:
  baseRate = sum(building.rate(kind) for building in town.buildings where building.constructionEndsAt is null)
  weatherMod = weatherModifier(currentWeather, kind)         // 0.5..1.5
  happinessMod = clamp(town.happiness / 100, 0.5, 1.2)
  produced = floor(baseRate * weatherMod * happinessMod * deltaT)
  resource.amount = min(resource.amount + produced, resource.cap)
town.lastTickAt = now
town.version += 1
```
All updates inside a single Prisma transaction per town. Towns are processed in batches of 50 to bound transaction time.

### Building Completion
A separate query `findMany({ where: { constructionEndsAt: { lte: now } } })` flips them to active in one go (no per-town scan).

### Combat Resolution
Pure function `resolveCombat(input): CombatReport`:
```
attackerPower = troopCount * attackTypeMultiplier * weatherMod
defenderPower = defenseRating + wallLevel*X + garrison*Y
ratio         = attackerPower / (attackerPower + defenderPower)
attackerCasualties = floor(troopCount * (1 - ratio) * lossFactor)
defenderCasualties = floor(garrison    * ratio       * lossFactor)
loot               = min(attackerSurvivors * lootPerTroop, defenderStockpile * lootCapPct)
damage             = floor(attackerSurvivors * damagePerTroop)
```
Anti-ragequit: hard cap `lootCapPct ≤ 30%`, defender keeps minimum 50% of each resource; buildings can be damaged but never destroyed below level 1.

### Weather Rotation
Every hour, pick next `WeatherKind` weighted by season/sector. Persist a `Weather` row with `startedAt`/`endsAt`. Sim reads "current" via `where: { startedAt: { lte: now }, endsAt: { gt: now } }` (single indexed row).

### World Event / AI News Pipeline
Cheap, no continuous LLM calls:
1. Detectors run after each major sub-tick and emit structured `EventCandidate { kind, sectorX, sectorY, payload }`.
   - e.g. "≥30% of farms in sector damaged by heatwave in last hour" → `SHORTAGE`.
   - e.g. "alliance war declared", "big raid resolved", "weather changed".
2. Each detector has a deterministic template:
   `"The {sectorName} suffers food shortages after {weather} damages {n} farms."`
3. Template-filled headline+body is persisted in `WorldEvent`.
4. Realtime gateway broadcasts new `WorldEvent` rows to all sockets.
5. Optional (post-MVP): batch up to 10 candidates/hour and send to an LLM for narrative polish; otherwise use templates only. **MVP ships with templates only — zero LLM cost.**

### Failure Modes
- Tick overruns 30s → next tick is skipped (Cron `@Lock` via Redis SETNX with TTL).
- DB transient error → tick is retried up to 3× with exponential backoff; town's `version` ensures idempotency.

---

## 5. Frontend Pages (Next.js App Router)

```
apps/web/src/app/
├── (auth)/login              # form -> POST /auth/login
├── (auth)/register           # form -> POST /auth/register
├── (game)/layout.tsx         # auth-required, opens WS, navbar
├── (game)/town               # resource panel, build menu, civilian stats
├── (game)/world              # 2D grid map (CSS grid, sectors as cells)
├── (game)/alliance           # create/join, member list, alliance chat (WS)
├── (game)/news               # live event feed (WS-pushed WorldEvent rows)
└── (game)/reports            # combat reports list + detail
```
State: React Query for REST + Zustand for socket-pushed live state.

---

## 6. Development Roadmap (implementation order)

| Phase | Deliverable | What ships |
|-------|-------------|------------|
| **0** | Repo scaffold | pnpm workspaces, `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared`, Prisma schema, `docker-compose.yml` (pg+redis), `.env.example`, root scripts (`dev`, `build`, `lint`, `typecheck`, `test`), GitHub Actions CI. |
| **1** | Auth + Town bootstrap | `auth` (register/login/refresh, argon2, JWT guard), `users`, `towns` create-on-first-login with starter buildings + resources. REST endpoints + Postman collection. |
| **2** | Tick simulation v1 | `simulation` module with 30s tick; `resources` generation; `buildings` construct/upgrade with completion timer. Town dashboard on frontend reads via REST. |
| **3** | Realtime push | Socket.IO gateway with JWT handshake; broadcast town updates to owner; news feed channel. Frontend Zustand store consumes events. |
| **4** | World map + async combat | World grid (sector seeding script), launch raid endpoint, combat resolution sub-tick, combat report storage + UI. |
| **5** | Weather + happiness | Weather rotation job, weather modifiers applied in tick, happiness/hunger drift, weather widget on town page. |
| **6** | Alliances + chat | Alliance CRUD, alliance Socket.IO room, alliance chat UI. |
| **7** | World events / AI news | Detectors + templates, `WorldEvent` feed, live push to news page. |
| **8** | Polish + deploy | Rate limiting, input validation (class-validator), pino logging, Fly.io / Railway deploy config, seed script, smoke E2E. |

PR strategy: one PR per phase, base off `main`. Phase 0 PR establishes the build/lint/CI floor everything else depends on.

---

## 7. Non-Goals for MVP (explicit)

- No graphics/animation beyond CSS + a few SVGs.
- No mobile-specific layout.
- No in-app purchases, energy meters, or premium currency.
- No PvP realtime; combat is fully async.
- No procedural map generation beyond a fixed 50×50 sector grid with seeded abandoned zones.
- No LLM in the hot path. AI narration is template-first; optional offline batch polish later.

---

## 8. Infra / Deploy

- **Local dev:** `docker compose up` brings up postgres + redis; `pnpm dev` runs api + web in parallel.
- **Prod:** Fly.io (recommended over Railway for free Postgres + persistent volumes). One Fly app per service: `webgame-api`, `webgame-web`. Managed Postgres + Upstash Redis.
- **Secrets:** `.env` locally, Fly secrets in prod. JWT signing key, DB URL, Redis URL.
- **CI:** GitHub Actions — install, lint, typecheck, prisma validate, build, unit tests. PRs blocked on green.

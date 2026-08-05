# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

IAXCORE AI Transparency Scanner — a web tool that scans a public URL for observable AI-transparency signals (EU AI Act Art. 50-adjacent) and produces a signed, verifiable report. The full product/engineering spec is `IAXCORE_AI_Transparency_Scanner_v0.5.1_CONSOLIDADO.md` (filename says v0.5.1, content is v0.5.2 — read the doc header, not the filename) — **read it before making product or architecture decisions**, especially §5 (module contracts), §6 (result vocabulary), §9 (security-bloqueante requirements), §10 (build phases and their gates), and §15 (data model). The spec is written for an agent to build from and explicitly names non-negotiable decisions in its §21 ("Decisiones que Claude Code no debe tomar solo").

The product cycle is **Scan → Fix → Rescan → Verify**, built in phases (Fase 0 → 7) each with an explicit exit gate defined in §10. As of this writing, Fase 0 (core contracts) and Fase 1 (immutable platform: DB, queue, signing, rate-limited API) are complete and verified end-to-end against the live database; Fase 2 (secure browser/SSRF) is functionally wired end-to-end — `apps/worker`'s `runWorkerOnce` now calls `packages/scanner`'s `runScan()` and persists its manifest/`pagesAnalyzed`/`finalUrl` into the `Evaluation` — but the exit-gate SSRF battery hasn't been run against real hostile fixtures (only local-server tests) and `runWorkerOnce`'s scanner-calling path is only unit-tested with `runScan`/`@iaxcore/db` mocked, not against a live Postgres end-to-end (that requires `DATABASE_POOLED_URL` + signing key env vars — see `index.integration.test.ts`). T1/T2 detection (Fase 3/5) still doesn't exist, so every completed evaluation has empty `findings`. The web UI (`apps/web`) is still the scaffold placeholder — no scan form, no results page.

## Commands

```bash
# Install (also runs `prisma generate` via packages/db's postinstall)
npm install

# Build everything / one workspace
npm run build
npm run build --workspace=@iaxcore/core

# Test everything / one workspace / one file
npm test
npm test --workspace=@iaxcore/db
npx vitest run src/t1.test.ts        # run from inside the package directory

# Typecheck a single package (no root-level "typecheck" script exists)
cd packages/core && npx tsc -p tsconfig.json --noEmit

# Web app dev server
npm run dev --workspace=@iaxcore/web

# Worker (long-running poll loop, not used in tests)
npm run start --workspace=@iaxcore/worker

# Prisma (must run from packages/db — prisma.config.ts loads ../../.env itself)
cd packages/db
npx prisma generate
npx prisma validate
```

**Integration tests require a real Postgres connection and are silently skipped otherwise.** Every `*.integration.test.ts` file starts with `describe.skipIf(!process.env.DATABASE_POOLED_URL)(...)` — set `DATABASE_POOLED_URL` (and for the worker/signing ones, `SIGNING_KEY_ID`/`SIGNING_PUBLIC_KEY_B64`/`SIGNING_PRIVATE_KEY_B64`) to actually run them, e.g.:

```bash
cd packages/db && DATABASE_POOLED_URL="postgresql://..." npx vitest run
```

Put the client construction (`createPooledClient()`) inside a `beforeAll`, not the `describe` body — `skipIf` skips hooks along with tests, but code that runs directly in the `describe` callback executes during test collection regardless of the skip.

## Architecture

**Monorepo, npm workspaces.** `apps/*` are deployables, `packages/*` are the shared engine:

- `packages/core` — pure logic, no I/O: the closed vocabulary (`ObservationStatus`, `AssessmentStatus`, etc. — `warning` must never appear in any of them, it's an explicit non-status), `deriveT1Assessment()` (the only function allowed to compute T1's assessment, per spec §5.1's derivation table), zod schemas for every entity in §15, Ed25519 signing (`signCanonicalJson`/`verifyCanonicalJsonSignature`) over a deterministic canonical JSON string (`canonicalizeForSigning` — sorted keys, no whitespace), `hashIp()`, copy dictionaries + forbidden-word checks, and the generic `Detector` contract that T1/T2/T3 implement.
- `packages/db` — Prisma repository layer. Nothing here does its own business logic beyond enforcing the invariants below; `packages/core`'s zod schemas validate at the write boundary instead of relying on Postgres enums for everything (see "detectorId is a String" below).
- `packages/detectors` — `t1Detector`/`t2Detector`/`t3Detector`: typed stubs implementing `Detector` from core, each currently throwing "not implemented" (T1 is Fase 3, T2 is Fase 5, T3 is never-in-this-pilot — this is intentional, not a gap to quietly fill in).
- `packages/scanner` — the SSRF address classifier (`checkUrl`/`classifyAddress`), the Playwright browser wrapper with its request-interception SSRF guard (`installSsrfGuard`, byte/redirect/request limits), robots.txt parsing, deterministic page selection, consent-banner handling, a local `EvidenceStore`, and `runScan()` — the orchestrator that ties all of the above into one full scan and produces the per-evaluation manifest (`pages` with completed/excluded status and exclusion reason, `blocked_requests`, `consent_interaction`) that spec §10-Fase 2's exit gate requires. Nothing outside this package calls `runScan()` yet — `apps/worker` still doesn't invoke it or persist its result to `Evaluation`.
- `apps/web` — Next.js App Router. `app/api/scans/route.ts` (POST, rate-limited) and `app/api/scans/[id]/route.ts` (GET) are the only real routes; everything else is scaffold. `lib/db.ts` holds a per-process singleton `PrismaClient` — don't call `createPooledClient()` per-request, it exhausts the connection pool.
- `apps/worker` — `src/index.ts` exports `runWorkerOnce(db, config)` (claim a job → mark running → `runScan()` the requested URL via `@iaxcore/scanner` → sign a report → complete with the scan's `finalUrl`/`pagesAnalyzed`/`manifest` → finish job), independently testable; `src/main.ts` is the actual polling-loop process entrypoint and isn't covered by tests. `evaluation.pagesRequested` (fixed at creation, §9's "hasta cinco páginas" cap) is passed to `runScan()` as `maxPages` — it's a cap set before the scan runs, not something the scan itself decides. The signed canonical report still only covers `{evaluationId, requestedUrl, methodVersion, findings: []}` — `findings` stays empty until T1 (Fase 3) exists; the richer manifest lands on `Evaluation` but isn't part of what's signed yet.

### The Evaluation lifecycle (Fase 1's core invariant)

`Evaluation.status` only moves `queued → running → completed` (or `→ failed`), and each transition in `packages/db/src/evaluations.ts` is a **conditional `updateMany`** gated on the expected prior status (`where: { id, status: "queued" }`, etc.), not a plain `update`. Zero rows matched means someone already moved it — the functions throw `ImmutableEvaluationTransitionError` rather than silently no-op. This is the entire immutability mechanism; there's no DB trigger enforcing it.

### Rate limiting is defense-in-depth, not just an app-level check

§9 requires "cuota diaria + concurrencia máxima de 1 escaneo por IP" as a testable requirement. `packages/db/src/rateLimit.ts`'s `assertWithinRateLimit` does the count-based check (has a TOCTOU race by itself), but the real guarantee is a **Postgres partial unique index** — `evaluations_one_active_per_ip` on `(requesterIpHash) WHERE status IN ('queued','running')` — that can't be expressed in `schema.prisma`'s DSL (no partial-index syntax) and was applied as a hand-written migration instead (see "Schema changes" below). `createRateLimitedScan` catches the resulting `P2002` and re-throws it as the same `RateLimitExceededError`, and creates the `Evaluation` + its `ScanJob` in one `$transaction` — doing those as two separate calls was a real bug caught mid-development (a failed second insert would strand a `queued` evaluation the worker can never see, permanently occupying that IP's one concurrency slot).

### Queue: Postgres `SKIP LOCKED`, no Redis

`packages/db/src/queue.ts`'s `claimNextScanJob` is a single raw-SQL `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING ...` — one round trip, which is why it works fine over a pgbouncer transaction-mode pooled connection (see below) even though Prisma's own CLI commands don't.

### Detector IDs and a couple of other fields are plain strings, not Postgres enums

`Finding.detectorId` (`"t1.channel"`, `"t1.ai_evidence"`, etc.) and `ReportArtifact.format` are `String` columns in `schema.prisma`, validated by `packages/core`'s zod schemas at the write boundary — Prisma enum values can't contain dots, so the spec's dot-separated detector IDs can't be native Postgres enums. `ObservationStatus`/`AssessmentStatus`/`EvidenceConfidenceBand`/`EvaluationStatus` *are* native enums, matching `packages/core`'s vocabulary constants exactly.

## Environment-specific things that will bite you

- **Prisma 7 moved connection config out of `schema.prisma`.** `datasource.url`/`directUrl` in the schema file now error at parse time. The CLI (`migrate`, `validate`, `generate`) gets its connection from `packages/db/prisma.config.ts` (which loads the repo-root `.env`); the generated `PrismaClient` gets its connection at runtime via a **driver adapter** (`@prisma/adapter-pg`'s `PrismaPg`), constructed in `packages/db/src/client.ts`'s `createPooledClient()`/`createDirectClient()` — not read from env automatically.
- **`DATABASE_URL` (direct, port 5432) may be unreachable** in sandboxed dev environments — Supabase's direct connection is IPv6-only by default, and some environments have no IPv6 route (`nslookup` will show only an AAAA record, no A record). `DATABASE_POOLED_URL` (Supavisor, port 6543) is the fallback that actually works; single-statement raw SQL (like the `SKIP LOCKED` claim) is fine over it, but Prisma's own migrate/status/resolve commands hang indefinitely over it because they hold advisory locks across multiple round trips, which pgbouncer transaction mode can't sustain.
- **Schema changes that need the Prisma CLI to actually run against the live DB won't work from an environment without direct-connection access.** The workaround used throughout this project: generate the SQL by hand (or via `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` for a from-scratch schema), apply it directly through Supabase's MCP `apply_migration`/`execute_sql` tools (HTTPS management API, bypasses the Postgres wire protocol entirely), then manually record it in `_prisma_migrations` (`id` = a fresh UUID, `checksum` = the sha256 hex of the migration file) so a future `prisma migrate deploy` from an environment that *does* have direct access won't try to reapply it. `prisma migrate dev` only diffs against `schema.prisma`, so a construct that's applied via raw SQL but documented only in a schema comment (like the partial unique index above) survives future migrations undisturbed.
- **Next.js can't resolve this monorepo's workspace packages without help.** `packages/core`/`packages/db` use NodeNext-style imports (`import "./foo.js"` pointing at `foo.ts`) — `tsc` and `vitest` resolve this natively, Next's webpack doesn't, even with `transpilePackages` set. `apps/web/next.config.mjs` sets `webpack: (config) => { config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] }; return config; }` to fix it. Any new Next app added to this repo that imports a workspace package will need the same fix.
- **RLS is off by default on every new Supabase table** and Supabase's advisors will flag it as critical (the `anon` key is public — it ends up in the browser bundle via `NEXT_PUBLIC_SUPABASE_ANON_KEY`). This project only ever accesses Postgres via Prisma using the `postgres` role, which bypasses RLS, so the fix applied has been "enable RLS with zero policies" on every table — that blocks all `anon`/`authenticated` access without affecting Prisma. If anything ever needs the Supabase JS client / anon key for real data access, RLS policies need to be written first, or it'll get zero rows back.
- Root `.env` (gitignored) holds real credentials for the live Supabase project, not a local-only database — there's a `docker-compose.yml` for a local Postgres alternative, but it's unverified (no Docker in some dev sandboxes).

# Zabankadeh

A bilingual, dedicated-instance platform for Iranian language institutes. This repository contains the first production-shaped vertical slice: a branded institute website, English/German placement assessment, staff dashboard, shared API contracts, and a tenant-scoped operational data model.

## Included

- Persian RTL public website with English-language navigation toggle and responsive course presentation
- Candidate intake and automatic placement for English or German across child, teen, and adult tracks
- Versioned, server-side scoring with provisional CEFR-like recommendations and per-skill results
- Staff dashboard for daily sessions, balances, applicant status, and common operations
- PostgreSQL model for tenants, branches, rooms, roles, people, students, guardians, instructors, programs, levels, terms, classes, sessions, enrollment, attendance, invoices, payments, assessments, website pages, background jobs, and audit events
- Docker-based PostgreSQL and Redis development infrastructure
- Provider-neutral SMS/payment contracts with console/mock development providers and Kavenegar/ZarinPal implementations
- Shared TypeScript contracts and independently buildable NestJS/Next.js applications

The bundled assessment questions are original demonstration content. They are not a calibrated production placement bank.

## Local setup

Requirements: Node.js 22+, npm 10+, and Docker.

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run dev
```

The public site runs at `http://localhost:3000`, the staff preview at `/admin`, the assessment at `/assessment`, and the API at `http://localhost:4000/v1`. PostgreSQL is deliberately exposed on port `5433` to avoid colliding with a locally installed database.

The development admin endpoint uses `x-admin-key: demo-admin`. Replace `ADMIN_DEMO_KEY`, and replace this temporary mechanism with OTP sessions and role checks before any production deployment.

## Verification

```bash
npm run typecheck
npm test
npm run build
docker compose exec -T postgres psql -U zabankadeh -d zabankadeh -c "select count(*) from assessment_questions;"
```

## API surface

- `GET /v1/health`
- `GET /v1/public/institute`
- `POST /v1/public/assessments/attempts`
- `POST /v1/public/assessments/attempts/:attemptId/submit`
- `GET /v1/admin/dashboard` with the development admin key

Assessment answer keys never leave the API. Submission locks the attempt, rejects expiry or replay, records the scoring version, and persists a reproducible result.

## Next implementation milestones

1. OTP authentication, persistent sessions, branch-scoped RBAC, and complete audit middleware.
2. Student/guardian, instructor, class, scheduling, enrollment, attendance, and billing workflows on top of the existing schema.
3. Wire the included Kavenegar and ZarinPal adapters into idempotent callbacks, receipts, and SMS outbox workers.
4. Question authoring, expert-review workflow, age-specific production banks, pilot analytics, and cut-score calibration.
5. Repeatable per-institute provisioning, encrypted backups, monitoring, and upgrade automation.

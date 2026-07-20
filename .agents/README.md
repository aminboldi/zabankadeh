# Zabankadeh agent handoff

## Current state

- The admin panel is a functional Next.js/NestJS/PostgreSQL slice.
- Local web/API ports are configured in the root `.env`; the current development setup uses web `3100` and API `4100`.
- OTP authentication uses persistent PostgreSQL sessions and the console SMS provider prints development OTPs.
- The API explicitly loads the root `.env`; Next.js loads it through `apps/web/next.config.ts`.
- The local database may need additive schema updates when an old Docker volume is reused. Current additions include auth tables, `people.gender`, and `classes.class_type`.

## Implemented admin workflows

- Staff OTP login and logout
- Tenant-scoped audit interceptor for authenticated state-changing requests
- Student list/search, registration, guardian details, Jalali birth dates, gender, generic age/gender avatars, detail view, editing, and status changes
- Instructor list and registration
- Class list and creation with branch, term, language, level, instructor, room, class type, capacity, and rial tuition formatting

## Current demo data

- Tenant: `demo`
- Bootstrap admin mobile is configured through `AUTH_BOOTSTRAP_MOBILE`.
- The local database has a demo summer term so class creation can be exercised.

## Next work

- Class sessions and calendar scheduling
- Enrollment and attendance
- Billing and payment workflows
- Replace additive local-volume fixes with a repeatable migration runner

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build` from the repository root.

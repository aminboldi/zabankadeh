# Zabankadeh agent handoff

## Current state

- The admin panel is a functional Next.js/NestJS/PostgreSQL slice.
- Local web/API ports are configured in the root `.env`; the current development setup uses web `3100` and API `4100`.
- OTP authentication uses persistent PostgreSQL sessions and the console SMS provider prints development OTPs.
- The API explicitly loads the root `.env`; Next.js loads it through `apps/web/next.config.ts`.
- API startup runs guarded, repeatable additive migrations for reused PostgreSQL volumes.
- The local database may need additive schema updates when an old Docker volume is reused. Current additions include auth tables, `people.gender`, and `classes.class_type`.

## Implemented admin workflows

- Staff OTP login and logout
- Tenant-scoped audit interceptor for authenticated state-changing requests
- Student list/search, registration, guardian details, Jalali birth dates, gender, generic age/gender avatars, detail view, editing, and status changes
- Instructor list and registration
- Class list and creation with branch, term, language, level, instructor, room, class type, capacity, and rial tuition formatting
- Session scheduling with Jalali date/time pickers, weekly recurrence, room conflict checks, and Google Meet/Skyroom links
- Responsive weekly and Jalali monthly calendars; clicking a day opens a prefilled session form for that date
- Existing calendar sessions open the edit modal and can be rescheduled or cancelled with room conflict checks
- Class roster management with enrollment creation and enrollment status updates
- Session-based attendance recording with present, absent, late, excused, and notes
- Instructor OTP accounts are recognized by their registered mobile and their session list is restricted to assigned sessions
- Instructor accounts land in a simplified attendance workspace with administrative navigation hidden
- Finance workflow with rial invoices, Jalali due dates, outstanding balances, and manual payment recording
- Management reports overview with enrollment, scheduled sessions, attendance, and outstanding finance metrics
- Finance invoice ledger CSV export with Persian labels and rial amounts
- Printable Persian invoice receipts from the finance ledger
- Admin assessment queue with automated recommendation review and tenant-scoped academic level overrides with reasons
- Completed assessment attempts can be registered as tenant-scoped student leads, with mobile/attempt duplicate protection

## Current demo data

- Tenant: `demo`
- Bootstrap admin mobile is configured through `AUTH_BOOTSTRAP_MOBILE`.
- The local database has a demo summer term so class creation can be exercised.

## Next work

- Refine calendar drag-and-drop and recurring-series management
- Add assessment detail history and connect lead conversion to the student detail timeline
- Add payment gateway integrations, exports, and scheduled reports
- Finance constraint: all payment flows target Iranian users and Iranian payment gateways only; amounts remain in rial and foreign gateways/accounts are out of scope
- Payment gateway configuration/status endpoint and ZarinPal-compatible adapter are available; manual payments remain the default until merchant credentials and callback URL are configured
- Enrollment and attendance
- Billing and payment workflows
- Expand the migration runner as new schema-backed workflows are introduced

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build` from the repository root.

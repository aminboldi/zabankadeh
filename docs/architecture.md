# Architecture decisions

## Deployment and tenancy

Every institute receives an isolated application and PostgreSQL deployment. All domain records still carry `tenant_id`; this provides defense in depth and permits a later shared-SaaS option. The configured `TENANT_SLUG` identifies the single institute served by a deployment.

## Assessment integrity

Published items retain provenance, license, validation state, and version. An attempt stores its ordered question identifiers and scoring version. The API removes correct answers before delivery, locks an attempt during submission, rejects expired/replayed submissions, and stores the result breakdown. Staff overrides belong in `override_band`, `override_reason`, and `overridden_by` and must also create an audit event.

The current percentage bands are explicitly a pilot algorithm. Production cut scores must be established independently for English/German and children/teens/adults using expert review and outcome data.

## Localization and money

UTC timestamps and Gregorian dates are canonical storage values. Interfaces may render Jalali dates. Monetary values are integer rials; presentation code must label conversions to tomans explicitly.

## Module boundaries

The Nest application is a modular monolith. Public branding, assessment, academic operations, billing, messaging, and identity share one transaction boundary but should not access each other's tables outside their service interfaces. PostgreSQL is the system of record; Redis is reserved for queues, rate limiting, and ephemeral sessions.

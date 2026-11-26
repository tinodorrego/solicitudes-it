# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: employees of a fictitious mid-size organization, mostly non-technical, who need something from IT (an incident fixed, access granted, hardware, software). They file a request and come back to check its status. Secondary (later versions): help-desk agents who work the queue by SLA, and approvers who authorize requests in categories that require it.

Secondary audience for the repository itself: recruiters and technical leads evaluating the author as functional analyst, requirements engineer and developer.

## Product Purpose

Replace requests sent by email and chat with a single channel where every request has a priority, an owner, a state and an SLA deadline. Success: a requester can file a complete request in under a minute and always knows its status and due time.

## Positioning

Every rule the interface shows — computed priority, SLA deadline, initial state, allowed transitions, SLA traffic light — is derived from a numbered requirement or business rule in `docs/` (RF-xx / RN-xx) and verified by tests that cite the same ID. The product doubles as an end-to-end requirements-to-code traceability showcase.

## Operating Context

Used in an office on desktop browsers, occasionally on a phone. v0.1 has no authentication: the requester is chosen from a list of seeded fictitious users (authentication is a documented pending requirement).

## Capabilities and Constraints

- v0.1: create request (title, description, category, requester, impact, urgency), priority computed from impact × urgency (RN-01), SLA deadline by priority (RN-02), initial state by category (RN-03), list with state filter ordered by deadline, SLA traffic light (RN-05).
- Pending: approve/reject, assign, state changes in UI, authentication and roles.
- Interface language: Spanish (Argentina).
- Stack: Next.js 16 App Router, TypeScript, Tailwind CSS 4, PostgreSQL via Drizzle (PGlite in development).

## Evidence on Hand

All people, emails and the organization are fictitious seed data (`src/db/seed.ts`). No real customers, metrics or testimonials exist; none may be invented.

## Product Principles

1. Show the rule, not just the result: when the system computes something (priority, deadline), the screen says why.
2. The requester never has to know IT jargon to file a complete request.
3. Every visible behavior traces to a documented requirement.
4. Honest status: pending features are marked pending, never faked.

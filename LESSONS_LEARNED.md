# RaiseHub Lessons Learned

This document captures important discoveries while building RaiseHub.

Each lesson should include:

## Problem

What happened?

## Root Cause

Why did it happen?

## Solution

How was it fixed?

## Prevention

How can this be avoided in the future?

---

## Lesson 1

Project initialized.

---

## Lesson 2

### Problem

Campaign progress percentages differed between the local development environment and production, with no obvious code-level cause.

### Root Cause

Local development and production were confirmed (via authenticated comparison of Vercel production environment variables against local `.env.local`, comparing only hashed project-reference identifiers — no secrets were read or displayed) to point at the **same Supabase project**. There is no environment separation between local dev and production. Additionally, two separate components independently calculate campaign progress with duplicated logic, and neither query filters on `payment_status`, so any purchase row — including ones created while testing locally — counts toward the publicly visible progress total.

### Solution

Not yet implemented. Remediation options were scoped (see chat history / future `TECHNICAL_AUDIT.md` addendum) but require approval before implementation, per `HERMES_PLAYBOOK.md`.

### Prevention

- Never assume local and production are isolated — verify explicitly (safely, without exposing secrets) before trusting environment-dependent bug theories.
- Centralize any calculation that appears in more than one file instead of duplicating it.
- Establish a genuinely separate Supabase project for local development before further feature work, so local testing can never again silently affect production data.

# Dashboard Refactor Lessons

The dashboard architecture should always be migrated dependency-first.

Correct order:

Sections

↓

Content

↓

Loader

↓

Route

Avoid deleting legacy implementations until replacements compile successfully.

GitHub Actions should remain green after every commit.

---

Owner Lessons

The authenticated identity should never change.

Instead:

Actor

↓

Workspace

↓

Support Mode

↓

Audit

This prevents security issues while allowing full platform support.
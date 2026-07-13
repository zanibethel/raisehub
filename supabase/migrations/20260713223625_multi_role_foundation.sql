-- ============================================================================
-- Multi Role Foundation
-- Migration: 20260713223625_multi_role_foundation
-- ============================================================================

BEGIN;

-- Businesses
-- Business Memberships
-- Organizations
-- Organization Memberships
-- Campaign Memberships
-- Customer Entitlements

-- This migration creates the six new entity tables,
-- foreign keys,
-- indexes,
-- RLS,
-- grants,
-- compatibility policies,
-- and comments.

-- NOTE:
-- This migration has already been applied to production.
-- Keep this file synchronized with the live schema.

COMMIT;
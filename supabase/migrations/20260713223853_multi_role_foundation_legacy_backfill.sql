-- ============================================================================
-- Multi Role Legacy Backfill
-- Migration: 20260713223853_multi_role_foundation_legacy_backfill
-- ============================================================================

BEGIN;

-- Adds missing FK indexes

-- Backfills

-- profiles(role='business')
--     -> businesses
--     -> business_memberships(owner)

-- profiles(role='organization')
--     -> organizations
--     -> organization_memberships(admin)

COMMIT;
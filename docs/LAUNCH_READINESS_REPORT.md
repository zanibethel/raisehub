# Launch readiness report

Current verdict:
- NO-GO unless all remaining launch-critical checks are proven

Completed:
- Audited all application call sites for `get_campaign_recovery_context(uuid)`, `get_public_campaign_progress(uuid[])`, `get_public_campaign_sellers(uuid)`, and `resolve_campaign_seller_referral(uuid, text)`
- Added a shared environment-aware RPC contract in app code with explicit `expected environment mode` and `expected demo group`
- Updated public campaign recovery/progress/referral call sites to pass environment expectations
- Added backward-compatible RPC fallback behavior so app can deploy before SQL without breaking public pages
- Prepared a new migration with hardened environment-aware signatures and grant/revoke updates
- Updated local Supabase typings for changed/new RPC signatures
- Added regression tests for strict RPC environment argument wiring and live-mode compatibility

Application changes:
- `src/lib/data-environment.ts`
- `src/lib/data-environment.test.ts`
- `src/lib/repositories/campaign-repository.ts`
- `src/lib/repositories/public-campaign-repository.ts`
- `src/lib/repositories/public-campaign-repository.test.ts`
- `src/lib/repositories/public-rpc-environment-contract.test.ts`
- `src/app/campaigns/[id]/page.tsx`
- `src/lib/supabase/database.types.ts`

Migration prepared:
- `supabase/migrations/20260806221500_harden_public_campaign_rpcs_by_environment.sql`

Supabase status:
- Prepared, not applied

Tests:
- Pending local run: `npm test`
- Pending local run: `npx tsc --noEmit`
- Pending local run: `npm run lint`
- Pending local run: `npm run build`

Required ChatGPT database action:
- Review and apply: `supabase/migrations/20260806221500_harden_public_campaign_rpcs_by_environment.sql`
- Run verification SQL listed in `## Supabase migration handoff`

Remaining blockers:
- Migration is not yet applied in Supabase
- Post-apply verification SQL has not yet been executed in Supabase
- Full local validation commands still must pass on this branch

Safe to merge:
- No

## Supabase migration handoff

Prepared, not yet applied to Supabase

- Exact migration filename:
  - `supabase/migrations/20260806221500_harden_public_campaign_rpcs_by_environment.sql`

- Complete list of functions changed:
  - `public.get_campaign_recovery_context`
  - `public.get_public_campaign_progress`
  - `public.get_public_campaign_sellers`
  - `public.resolve_campaign_seller_referral`

- Old and new function signatures:
  - `public.get_campaign_recovery_context(uuid)` → `public.get_campaign_recovery_context(uuid, text, text)`
  - `public.get_public_campaign_progress(uuid[])` → `public.get_public_campaign_progress(uuid[], text, text)`
  - `public.get_public_campaign_sellers(uuid)` → `public.get_public_campaign_sellers(uuid, text, text)`
  - `public.resolve_campaign_seller_referral(uuid, text)` → `public.resolve_campaign_seller_referral(uuid, text, text, text)`

- Required grants and revocations:
  - Revoke anon/auth/public access from old signatures:
    - `revoke all on function public.get_campaign_recovery_context(uuid) from public, anon, authenticated;`
    - `revoke all on function public.get_public_campaign_progress(uuid[]) from public, anon, authenticated;`
    - `revoke all on function public.get_public_campaign_sellers(uuid) from public, anon, authenticated;`
    - `revoke all on function public.resolve_campaign_seller_referral(uuid, text) from public, anon, authenticated;`
  - Revoke then grant anon/auth/service_role execute on new signatures:
    - `public.get_campaign_recovery_context(uuid, text, text)`
    - `public.get_public_campaign_progress(uuid[], text, text)`
    - `public.get_public_campaign_sellers(uuid, text, text)`
    - `public.resolve_campaign_seller_referral(uuid, text, text, text)`

- Expected behavior for production:
  - Calls must send `p_expected_environment_mode = 'production'` and `p_expected_demo_group = null`
  - Production calls can only return rows where campaign ownership is exactly `is_demo = false AND demo_group IS NULL`
  - Production calls cannot retrieve demo rows or demo-group-scoped data

- Expected behavior for Demo:
  - Calls must send `p_expected_environment_mode = 'demo'` and a non-empty `p_expected_demo_group`
  - Demo calls can only return rows where campaign ownership is exactly `is_demo = true AND demo_group = p_expected_demo_group`
  - Demo group A cannot retrieve Demo group B data

- Rollback SQL or rollback migration plan:
  - Immediate rollback plan:
    1. Re-grant anon/auth execute on old signatures (`uuid` / `uuid[]` / `uuid,text` variants) if emergency restore is required.
    2. Revoke execute on new signatures from anon/auth.
    3. Optionally drop the new overloads:
       - `drop function if exists public.get_campaign_recovery_context(uuid, text, text);`
       - `drop function if exists public.get_public_campaign_progress(uuid[], text, text);`
       - `drop function if exists public.get_public_campaign_sellers(uuid, text, text);`
       - `drop function if exists public.resolve_campaign_seller_referral(uuid, text, text, text);`
  - Preferred rollback approach: apply a dedicated rollback migration to preserve auditability.

- Any required deployment ordering:
  - Backward-compatible staged deployment is required.
  - Stage 1: deploy this application branch first (it includes fallback to old signatures when new overloads are not yet present).
  - Stage 2: apply `20260806221500_harden_public_campaign_rpcs_by_environment.sql`.
  - Stage 3 (optional cleanup): remove fallback paths in app code after SQL is confirmed in all environments.

- Exact verification SQL for ChatGPT to run after applying it:
  - Verify signatures exist:
    ```sql
    select n.nspname as schema, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_campaign_recovery_context',
        'get_public_campaign_progress',
        'get_public_campaign_sellers',
        'resolve_campaign_seller_referral'
      )
    order by p.proname, args;
    ```
  - Verify old signatures are no longer executable by anon/auth:
    ```sql
    select
      has_function_privilege('anon', 'public.get_campaign_recovery_context(uuid)', 'EXECUTE') as anon_old_recovery_exec,
      has_function_privilege('authenticated', 'public.get_campaign_recovery_context(uuid)', 'EXECUTE') as auth_old_recovery_exec,
      has_function_privilege('anon', 'public.get_public_campaign_progress(uuid[])', 'EXECUTE') as anon_old_progress_exec,
      has_function_privilege('authenticated', 'public.get_public_campaign_progress(uuid[])', 'EXECUTE') as auth_old_progress_exec,
      has_function_privilege('anon', 'public.get_public_campaign_sellers(uuid)', 'EXECUTE') as anon_old_sellers_exec,
      has_function_privilege('authenticated', 'public.get_public_campaign_sellers(uuid)', 'EXECUTE') as auth_old_sellers_exec,
      has_function_privilege('anon', 'public.resolve_campaign_seller_referral(uuid, text)', 'EXECUTE') as anon_old_referral_exec,
      has_function_privilege('authenticated', 'public.resolve_campaign_seller_referral(uuid, text)', 'EXECUTE') as auth_old_referral_exec;
    ```
  - Verify production cannot read demo context/progress/sellers/referral:
    ```sql
    with demo_campaign as (
      select id, demo_group
      from public.campaigns
      where is_demo = true and demo_group is not null
      order by created_at desc
      limit 1
    )
    select
      (select count(*) from public.get_campaign_recovery_context((select id from demo_campaign), 'production', null)) as prod_demo_recovery_count,
      (select count(*) from public.get_public_campaign_progress(array[(select id from demo_campaign)], 'production', null)) as prod_demo_progress_count,
      (select count(*) from public.get_public_campaign_sellers((select id from demo_campaign), 'production', null)) as prod_demo_sellers_count,
      (select count(*) from public.resolve_campaign_seller_referral(
        (select id from demo_campaign),
        coalesce((select referral_code from public.campaign_sellers where campaign_id = (select id from demo_campaign) and referral_code is not null limit 1), 'no-code'),
        'production',
        null
      )) as prod_demo_referral_count;
    ```
  - Verify demo group isolation and same-group success:
    ```sql
    with grouped as (
      select id, demo_group
      from public.campaigns
      where is_demo = true and demo_group is not null
      order by created_at desc
    ),
    g1 as (
      select id, demo_group from grouped limit 1
    ),
    g2 as (
      select id, demo_group from grouped where demo_group <> (select demo_group from g1) limit 1
    )
    select
      (select count(*) from public.get_public_campaign_progress(array[(select id from g1)], 'demo', (select demo_group from g1))) as demo_same_group_progress_count,
      (select count(*) from public.get_public_campaign_progress(array[(select id from g1)], 'demo', coalesce((select demo_group from g2), '__missing_group__'))) as demo_cross_group_progress_count;
    ```
  - Verify production still succeeds for production campaigns:
    ```sql
    with live_campaign as (
      select id
      from public.campaigns
      where is_demo = false and demo_group is null
      order by created_at desc
      limit 1
    )
    select
      (select count(*) from public.get_campaign_recovery_context((select id from live_campaign), 'production', null)) as prod_live_recovery_count,
      (select count(*) from public.get_public_campaign_progress(array[(select id from live_campaign)], 'production', null)) as prod_live_progress_count;
    ```

- Expected Supabase security advisor results:
  - No new warnings about broad anon/auth execute on old insecure signatures for these four RPCs.
  - New signatures remain SECURITY DEFINER but are explicitly environment-gated and keep public access only for required public experience flows.

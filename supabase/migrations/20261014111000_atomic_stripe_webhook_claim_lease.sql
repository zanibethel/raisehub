-- Atomic Stripe webhook delivery ownership. Applied to production on 2026-10-14.
alter table public.stripe_webhook_events add column if not exists claim_token uuid;
alter table public.stripe_webhook_events add column if not exists claim_expires_at timestamptz;
create or replace function public.claim_stripe_webhook_event(p_event_id text,p_event_type text,p_livemode boolean,p_payload jsonb,p_token uuid,p_lease_seconds integer default 300)
returns text language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
 if p_event_id is null or length(trim(p_event_id))=0 or p_token is null or p_lease_seconds < 60 or p_lease_seconds > 900 then raise exception 'Invalid webhook claim arguments'; end if;
 insert into public.stripe_webhook_events(stripe_event_id,event_type,livemode,payload,processing_status,attempt_count,claim_token,claim_expires_at,updated_at)
 values(p_event_id,p_event_type,p_livemode,p_payload,'processing',1,p_token,now()+make_interval(secs=>p_lease_seconds),now())
 on conflict(stripe_event_id) do update set processing_status='processing',attempt_count=public.stripe_webhook_events.attempt_count+1,
 claim_token=excluded.claim_token,claim_expires_at=excluded.claim_expires_at,last_error=null,updated_at=now()
 where public.stripe_webhook_events.processing_status in ('failed','received')
 or (public.stripe_webhook_events.processing_status='processing' and public.stripe_webhook_events.claim_expires_at < now());
 if found then return 'claimed'; end if;
 select processing_status into v_status from public.stripe_webhook_events where stripe_event_id=p_event_id;
 if v_status in ('processed','ignored') then return 'duplicate'; end if;
 return 'busy';
end $$;
create or replace function public.finish_stripe_webhook_event(p_event_id text,p_token uuid,p_status text,p_error text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if p_status not in ('processed','ignored','failed') then raise exception 'Invalid webhook completion status'; end if;
 update public.stripe_webhook_events set processing_status=p_status,
 processed_at=case when p_status='failed' then null else now() end,
 last_error=left(p_error,1000),claim_token=null,claim_expires_at=null,updated_at=now()
 where stripe_event_id=p_event_id and claim_token=p_token and processing_status='processing';
 return found;
end $$;
revoke all on function public.claim_stripe_webhook_event(text,text,boolean,jsonb,uuid,integer) from public,anon,authenticated;
revoke all on function public.finish_stripe_webhook_event(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_stripe_webhook_event(text,text,boolean,jsonb,uuid,integer) to service_role;
grant execute on function public.finish_stripe_webhook_event(text,uuid,text,text) to service_role;

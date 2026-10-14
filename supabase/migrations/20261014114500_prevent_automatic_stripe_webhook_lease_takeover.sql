-- Safety follow-up: never automatically take over an expired processing claim.
-- A stale worker could still be executing non-idempotent side effects.
-- Recovery requires investigation and an explicitly authorized transition to failed.
create or replace function public.claim_stripe_webhook_event(
 p_event_id text,p_event_type text,p_livemode boolean,p_payload jsonb,
 p_token uuid,p_lease_seconds integer default 300
) returns text language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
 if p_event_id is null or length(trim(p_event_id))=0 or p_token is null or p_lease_seconds < 60 or p_lease_seconds > 900 then raise exception 'Invalid webhook claim arguments'; end if;
 insert into public.stripe_webhook_events(stripe_event_id,event_type,livemode,payload,processing_status,attempt_count,claim_token,claim_expires_at,updated_at)
 values(p_event_id,p_event_type,p_livemode,p_payload,'processing',1,p_token,now()+make_interval(secs=>p_lease_seconds),now())
 on conflict(stripe_event_id) do update set processing_status='processing',attempt_count=public.stripe_webhook_events.attempt_count+1,
 claim_token=excluded.claim_token,claim_expires_at=excluded.claim_expires_at,last_error=null,updated_at=now()
 where public.stripe_webhook_events.processing_status in ('failed','received');
 if found then return 'claimed'; end if;
 select processing_status into v_status from public.stripe_webhook_events where stripe_event_id=p_event_id;
 if v_status in ('processed','ignored') then return 'duplicate'; end if;
 return 'busy';
end $$;
revoke all on function public.claim_stripe_webhook_event(text,text,boolean,jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_stripe_webhook_event(text,text,boolean,jsonb,uuid,integer) to service_role;

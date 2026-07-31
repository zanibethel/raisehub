alter table public.support_requests
  add column if not exists customer_reply_sent_at timestamptz null;

create index if not exists support_requests_reply_sent_at_idx
  on public.support_requests (requester_user_id, customer_reply_sent_at desc)
  where customer_reply_sent_at is not null;

alter table public.webportal_ad_orders
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists review_note text,
  add column if not exists rejected_at timestamptz,
  add column if not exists deactivated_at timestamptz;

alter table public.webportal_ad_orders
  drop constraint if exists webportal_ad_orders_review_note_length;

alter table public.webportal_ad_orders
  add constraint webportal_ad_orders_review_note_length
  check (review_note is null or char_length(review_note) <= 500);

create index if not exists webportal_ad_orders_review_queue_idx
  on public.webportal_ad_orders (status, purchased_at desc)
  where status in ('paid_pending_review', 'active');

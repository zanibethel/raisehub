-- Prevent RETURNS TABLE output names from conflicting with unqualified table columns
-- inside the payment reconciliation function.

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.reconcile_purchase_payment_event(text,text,text,text,text,text,integer,text,text)'::regprocedure
  ) into v_definition;

  v_definition := replace(
    v_definition,
    E'AS $function$\ndeclare',
    E'AS $function$\n#variable_conflict use_column\ndeclare'
  );

  execute v_definition;
end;
$$;

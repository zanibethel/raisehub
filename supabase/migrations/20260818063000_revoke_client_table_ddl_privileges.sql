-- RLS does not apply to TRUNCATE. Client roles also do not need REFERENCES or
-- TRIGGER privileges for normal Supabase CRUD. Remove these privileges from all
-- existing public tables and prevent the same grants on future postgres-owned
-- tables created in the public schema.

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, references, trigger on table %I.%I from anon, authenticated',
      table_record.schemaname,
      table_record.tablename
    );
  end loop;
end;
$$;

alter default privileges in schema public
revoke truncate, references, trigger on tables from anon, authenticated;

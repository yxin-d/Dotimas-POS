-- complete_sale and record_credit_change are SECURITY DEFINER, which means
-- by default Postgres/Supabase exposes them to anon (unauthenticated) callers
-- via PostgREST at /rest/v1/rpc/<name> — independent of any auth check in the
-- Next.js app. Lock execution down to logged-in users only.
revoke execute on function public.complete_sale(uuid, payment_method_type, numeric, boolean, jsonb) from public;
revoke execute on function public.record_credit_change(uuid, uuid, ledger_entry_type, numeric, text) from public;

grant execute on function public.complete_sale(uuid, payment_method_type, numeric, boolean, jsonb) to authenticated;
grant execute on function public.record_credit_change(uuid, uuid, ledger_entry_type, numeric, text) to authenticated;

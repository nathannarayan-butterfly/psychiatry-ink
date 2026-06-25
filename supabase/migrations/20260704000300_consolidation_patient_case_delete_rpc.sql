-- ===========================================================================
-- Supabase consolidation (Prisma removal) — patient case atomic delete RPC.
--
-- Adds a SECURITY DEFINER function that deletes a patient case together with
-- its encrypted workspace snapshots in a single transaction, replacing the
-- Prisma `$transaction([deleteMany snapshot, delete case])` in
-- server/routes/patients.ts. A plpgsql function body executes atomically, so
-- either both deletes commit or neither does (no orphaned snapshot rows).
--
-- Ownership is verified by the Express API before this is called (the route
-- loads the case and checks account_id), mirroring the pre-existing behaviour
-- where the ownership check preceded the Prisma transaction. The function only
-- deletes by the opaque case_id.
--
-- Additive and idempotent-safe (`create or replace function`). Execution is
-- locked to service_role only, following the lock pattern established by
-- `consolidation_credit_rpcs_lock_execute`.
-- ===========================================================================

create or replace function public.patient_case_delete_with_snapshots(p_case_id text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  -- Case ids are globally unique; drop any encrypted workspace snapshot for this
  -- case first, then the case registry row. Both run in one transaction.
  delete from public.encrypted_workspace_snapshots where case_id = p_case_id;
  delete from public.patient_cases where case_id = p_case_id;
end;
$$;

-- Lock execution to the service role (Express API) only. Supabase default
-- privileges grant EXECUTE on new public functions to anon + authenticated
-- explicitly, and `revoke ... from public` does not remove those; revoke from
-- all three, then re-grant to service_role.
revoke all on function public.patient_case_delete_with_snapshots(text) from public, anon, authenticated;
grant execute on function public.patient_case_delete_with_snapshots(text) to service_role;

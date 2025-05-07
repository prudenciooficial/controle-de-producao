
-- Function to begin a transaction
CREATE OR REPLACE FUNCTION public.begin_transaction()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(42);
END;
$function$;

-- Function to end (commit) a transaction
CREATE OR REPLACE FUNCTION public.end_transaction()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- This is basically a no-op since the transaction will be committed automatically
  -- when the function call completes successfully
  NULL;
END;
$function$;

-- Function to abort (rollback) a transaction
CREATE OR REPLACE FUNCTION public.abort_transaction()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'Transaction aborted';
END;
$function$;

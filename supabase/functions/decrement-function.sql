
CREATE OR REPLACE FUNCTION public.decrement(x numeric)
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT remaining_quantity - x
$$;

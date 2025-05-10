
-- Update the decrement function to handle the error by using proper parameters
CREATE OR REPLACE FUNCTION public.decrement(remaining numeric, amount numeric)
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT remaining - amount
$$;

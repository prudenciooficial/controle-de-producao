
-- Function to clean up duplicate material batches
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_material_batches()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete duplicate material batches, keeping only the most recently created one
  -- for each material_id and batch_number combination
  DELETE FROM material_batches mb
  WHERE mb.id NOT IN (
    SELECT MAX(id) 
    FROM material_batches 
    GROUP BY material_id, batch_number
  );
END;
$$;

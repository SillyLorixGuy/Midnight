-- RPC to append an entry into the `entry` JSON column for the authenticated user.
-- This implements one-row-per-user where `entry` stores a JSON array of entries.
-- Run this in Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.append_entry(_entry json) RETURNS TABLE(id uuid) LANGUAGE plpgsql AS $$
DECLARE
  uid uuid := auth.uid()::uuid;
  existing json;
BEGIN
  -- Try to read existing entry for user
  SELECT entry INTO existing FROM public.entries WHERE user_id = uid;

  IF NOT FOUND OR existing IS NULL THEN
    -- No row exists: insert a new row with an array containing the entry
    INSERT INTO public.entries (user_id, entry) VALUES (uid, json_build_array(_entry)) RETURNING id INTO id;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If existing is an array, append; otherwise create an array with existing + new
  IF json_typeof(existing) = 'array' THEN
    UPDATE public.entries
    SET entry = (existing::jsonb || jsonb_build_array(_entry))::json
    WHERE user_id = uid
    RETURNING id INTO id;
  ELSE
    UPDATE public.entries
    SET entry = json_build_array(existing, _entry)
    WHERE user_id = uid
    RETURNING id INTO id;
  END IF;

  RETURN NEXT;
END;
$$;

-- Allow authenticated users to execute the function
GRANT EXECUTE ON FUNCTION public.append_entry(json) TO authenticated;

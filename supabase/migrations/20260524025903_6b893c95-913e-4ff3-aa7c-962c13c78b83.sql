
-- 1. Profiles: restrict public read; only authenticated users can view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. user_roles: explicit deny on INSERT/UPDATE/DELETE for non-admins
--    (existing "Admins can manage roles" ALL policy still allows admins)
--    Add a restrictive policy so only admins can write.
CREATE POLICY "Only admins can insert roles"
ON public.user_roles AS RESTRICTIVE FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles AS RESTRICTIVE FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles AS RESTRICTIVE FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Bookings: restrict client updates to cancellation only
DROP POLICY IF EXISTS "Client cancels own booking" ON public.bookings;

CREATE POLICY "Client can cancel own booking"
ON public.bookings FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (
  auth.uid() = client_id
  AND status = 'cancelled'::booking_status
);

-- Enforce immutability of key fields on client cancellation via trigger
CREATE OR REPLACE FUNCTION public.enforce_client_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip checks for admins and trainers updating their own booking
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = OLD.trainer_id THEN
    RETURN NEW;
  END IF;
  -- For clients: only status may change, and only to 'cancelled'
  IF auth.uid() = OLD.client_id THEN
    IF NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.service_id IS DISTINCT FROM OLD.service_id
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Clients may only cancel their booking';
    END IF;
    IF NEW.status <> 'cancelled'::booking_status THEN
      RAISE EXCEPTION 'Clients may only set status to cancelled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_client_booking_update_trg ON public.bookings;
CREATE TRIGGER enforce_client_booking_update_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_client_booking_update();

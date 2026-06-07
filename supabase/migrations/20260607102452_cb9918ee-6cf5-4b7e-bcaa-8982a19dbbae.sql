
-- 1) Profiles: split SELECT into public columns + private contact (owner/admin only)
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Public profile fields viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Column-level: revoke sensitive columns from authenticated, regrant only via owner check using a view
REVOKE SELECT (phone, telegram, whatsapp) ON public.profiles FROM authenticated;
REVOKE SELECT (phone, telegram, whatsapp) ON public.profiles FROM anon;

-- Provide a secure accessor for own contact info (and admin)
CREATE OR REPLACE FUNCTION public.get_profile_contact(_user_id uuid)
RETURNS TABLE(phone text, telegram text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.phone, p.telegram, p.whatsapp FROM public.profiles p
  WHERE p.id = _user_id
    AND (auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'::app_role));
$$;
REVOKE EXECUTE ON FUNCTION public.get_profile_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_contact(uuid) TO authenticated;

-- 2) Attach trigger preventing trainer self-approval (function already exists)
DROP TRIGGER IF EXISTS protect_trainer_approval_trg ON public.trainers;
CREATE TRIGGER protect_trainer_approval_trg
  BEFORE UPDATE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION public.protect_trainer_approval();

-- 3) Restrict trainer booking updates: only status & meeting_url may change
CREATE OR REPLACE FUNCTION public.enforce_trainer_booking_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = OLD.trainer_id AND auth.uid() <> OLD.client_id THEN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
       OR NEW.service_id IS DISTINCT FROM OLD.service_id
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.slot_id IS DISTINCT FROM OLD.slot_id
       OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Trainers may only update status and meeting_url';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_trainer_booking_update_trg ON public.bookings;
CREATE TRIGGER enforce_trainer_booking_update_trg
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trainer_booking_update();

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_trainer_approved(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_trainer_approved(uuid, boolean) TO authenticated;


-- 1. Trigger: prevent non-admins from changing trainers.is_approved
CREATE OR REPLACE FUNCTION public.protect_trainer_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change trainer approval status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_trainer_approval_trigger ON public.trainers;
CREATE TRIGGER protect_trainer_approval_trigger
BEFORE UPDATE ON public.trainers
FOR EACH ROW
EXECUTE FUNCTION public.protect_trainer_approval();

-- 2. Admin RPC to set approval
CREATE OR REPLACE FUNCTION public.admin_set_trainer_approved(_trainer_user_id uuid, _approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change trainer approval status';
  END IF;
  UPDATE public.trainers SET is_approved = _approved WHERE user_id = _trainer_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_trainer_approved(uuid, boolean) TO authenticated;

-- 3. Remove duplicate 'client' role from Mikhail Novikov (keeps admin + trainer)
DELETE FROM public.user_roles
WHERE user_id = '9853d362-0163-462b-8ca6-09fee9bad507'
  AND role = 'client'::app_role;

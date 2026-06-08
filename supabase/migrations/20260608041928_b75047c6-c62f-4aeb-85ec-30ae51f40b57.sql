
-- 1. Fix handle_new_user: whitelist role to prevent admin self-registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _requested text;
  _role app_role;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  _requested := new.raw_user_meta_data->>'role';
  _role := CASE
    WHEN _requested = 'trainer' THEN 'trainer'::app_role
    ELSE 'client'::app_role
  END;
  insert into public.user_roles (user_id, role) values (new.id, _role);

  if _role = 'trainer'::app_role then
    insert into public.trainers (user_id, specialization, is_approved)
    values (new.id, 'Персональный тренинг', false)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;

-- 2. Restrict access to sensitive contact columns on profiles via column-level grants.
-- Owners (and admins) read contact fields through the existing get_profile_contact() RPC.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, bio, created_at, updated_at) ON public.profiles TO authenticated;
GRANT SELECT (id, full_name, avatar_url, bio) ON public.profiles TO anon;
-- Owner UPDATE still allowed via RLS; ensure update grant covers contact columns for owner only.
GRANT UPDATE (full_name, avatar_url, bio, phone, telegram, whatsapp) ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- 3. Enforce server-side booking amount: clients cannot pick the price.
CREATE OR REPLACE FUNCTION public.enforce_booking_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _price numeric;
BEGIN
  -- Admins may set any amount (e.g. manual adjustments)
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.service_id IS NOT NULL THEN
    SELECT price INTO _price FROM public.services WHERE id = NEW.service_id;
    IF _price IS NULL THEN
      RAISE EXCEPTION 'Service not found';
    END IF;
    NEW.amount := _price;
  ELSE
    NEW.amount := 0;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.enforce_booking_amount() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_booking_amount_ins ON public.bookings;
CREATE TRIGGER enforce_booking_amount_ins
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_amount();

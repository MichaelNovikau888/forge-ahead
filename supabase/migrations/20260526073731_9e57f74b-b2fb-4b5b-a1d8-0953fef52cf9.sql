CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _role app_role;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  _role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'client'::app_role);
  insert into public.user_roles (user_id, role) values (new.id, _role);

  if _role = 'trainer'::app_role then
    insert into public.trainers (user_id, specialization, is_approved)
    values (new.id, 'Персональный тренинг', false)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;
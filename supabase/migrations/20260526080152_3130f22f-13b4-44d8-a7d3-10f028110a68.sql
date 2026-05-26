
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'novikovmm1981@gmail.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'user not found';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'trainer')
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.trainers (user_id, specialization, is_approved, price_per_hour, experience_years)
  VALUES (uid, 'Персональный тренинг', true, 2000, 1)
  ON CONFLICT (user_id) DO UPDATE SET is_approved = true;
END $$;

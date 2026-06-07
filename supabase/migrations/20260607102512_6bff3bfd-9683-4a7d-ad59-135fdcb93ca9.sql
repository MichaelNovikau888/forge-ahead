
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_client_booking_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_trainer_booking_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_slot_booked() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_trainer_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_contact(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_trainer_approved(uuid, boolean) FROM anon;


-- Availability slots
CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(user_id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_time_valid CHECK (end_at > start_at)
);

CREATE INDEX idx_slots_trainer_start ON public.availability_slots(trainer_id, start_at);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view free slots of approved trainers"
ON public.availability_slots FOR SELECT
TO public
USING (
  is_booked = false
  AND EXISTS (SELECT 1 FROM public.trainers t WHERE t.user_id = trainer_id AND t.is_approved = true)
);

CREATE POLICY "Trainer manages own slots"
ON public.availability_slots FOR ALL
TO authenticated
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Admin manages all slots"
ON public.availability_slots FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Link bookings to slots
ALTER TABLE public.bookings ADD COLUMN slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL;

-- Auto mark/unmark slot booked
CREATE OR REPLACE FUNCTION public.sync_slot_booked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.slot_id IS NOT NULL THEN
      UPDATE public.availability_slots SET is_booked = true WHERE id = NEW.slot_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND OLD.slot_id IS NOT NULL THEN
      UPDATE public.availability_slots SET is_booked = false WHERE id = OLD.slot_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.slot_id IS NOT NULL THEN
      UPDATE public.availability_slots SET is_booked = false WHERE id = OLD.slot_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_bookings_sync_slot
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_slot_booked();

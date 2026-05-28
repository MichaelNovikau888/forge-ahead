import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ProfileLite = { id: string; full_name: string | null; avatar_url?: string | null; bio?: string | null };

async function loadProfiles(ids: string[], fields = "id, full_name, avatar_url, bio") {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, ProfileLite>();

  const { data, error } = await supabase.from("profiles").select(fields).in("id", uniqueIds);
  if (error) return new Map<string, ProfileLite>();

  return new Map((data ?? []).map((profile) => [profile.id, profile as ProfileLite]));
}

export const trainersQuery = queryOptions({
  queryKey: ["trainers", "visible"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trainers")
      .select("user_id, specialization, experience_years, price_per_hour, rating, is_approved")
      .order("is_approved", { ascending: false })
      .order("rating", { ascending: false });
    if (error) throw error;
    const trainers = data ?? [];
    const profiles = await loadProfiles(trainers.map((trainer) => trainer.user_id));
    return trainers.map((trainer) => ({ ...trainer, profiles: profiles.get(trainer.user_id) ?? null }));
  },
});

export const allTrainersQuery = queryOptions({
  queryKey: ["trainers", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trainers")
      .select("user_id, specialization, experience_years, price_per_hour, rating, is_approved, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const trainers = data ?? [];
    const profiles = await loadProfiles(trainers.map((trainer) => trainer.user_id));
    return trainers.map((trainer) => ({ ...trainer, profiles: profiles.get(trainer.user_id) ?? null }));
  },
});

export const myBookingsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["bookings", "client", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, scheduled_at, status, notes, trainer_id, amount, payment_status, meeting_url")
        .eq("client_id", userId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      const bookings = data ?? [];
      const profiles = await loadProfiles(bookings.map((booking) => booking.trainer_id), "id, full_name");
      return bookings.map((booking) => ({ ...booking, profiles: profiles.get(booking.trainer_id) ?? null }));
    },
  });

export const trainerBookingsQuery = (trainerId: string) =>
  queryOptions({
    queryKey: ["bookings", "trainer", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, scheduled_at, status, notes, client_id")
        .eq("trainer_id", trainerId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      const bookings = data ?? [];
      const profiles = await loadProfiles(bookings.map((booking) => booking.client_id), "id, full_name");
      return bookings.map((booking) => ({ ...booking, profiles: profiles.get(booking.client_id) ?? null }));
    },
  });

export const allBookingsQuery = queryOptions({
  queryKey: ["bookings", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, scheduled_at, status, client_id, trainer_id")
      .order("scheduled_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});
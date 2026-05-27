import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const trainersQuery = queryOptions({
  queryKey: ["trainers", "approved"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trainers")
      .select("user_id, specialization, experience_years, price_per_hour, rating, is_approved, profiles!inner(full_name, avatar_url, bio)")
      .eq("is_approved", true)
      .order("rating", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const allTrainersQuery = queryOptions({
  queryKey: ["trainers", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trainers")
      .select("user_id, specialization, experience_years, price_per_hour, rating, is_approved, profiles(full_name, avatar_url, bio)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const myBookingsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["bookings", "client", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, scheduled_at, status, notes, trainer_id, amount, payment_status, meeting_url, profiles:trainer_id(full_name)")
        .eq("client_id", userId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const trainerBookingsQuery = (trainerId: string) =>
  queryOptions({
    queryKey: ["bookings", "trainer", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, scheduled_at, status, notes, client_id, profiles:client_id(full_name)")
        .eq("trainer_id", trainerId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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
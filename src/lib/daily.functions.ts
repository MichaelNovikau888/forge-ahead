import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createMeetingForBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ bookingId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) throw new Error("DAILY_API_KEY не настроен");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Получаем бронирование (через admin, проверяя доступ вручную)
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("id, client_id, trainer_id, scheduled_at, meeting_url, payment_status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error || !booking) throw new Error("Бронирование не найдено");
    if (booking.client_id !== userId && booking.trainer_id !== userId) {
      throw new Error("Нет доступа к этому бронированию");
    }
    if (booking.meeting_url) return { url: booking.meeting_url };

    // Комната истекает через 4 часа после начала тренировки
    const exp = Math.floor(new Date(booking.scheduled_at).getTime() / 1000) + 4 * 60 * 60;
    const roomName = `fm-${booking.id.slice(0, 8)}-${Date.now().toString(36)}`;

    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: { exp, enable_chat: true, enable_screenshare: true },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Daily API ${res.status}: ${text}`);
    }
    const room = (await res.json()) as { url: string };

    await supabaseAdmin.from("bookings").update({ meeting_url: room.url }).eq("id", booking.id);
    return { url: room.url };
  });
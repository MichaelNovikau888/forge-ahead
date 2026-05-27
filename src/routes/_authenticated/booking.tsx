import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const search = z.object({
  trainerId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({ meta: [{ title: "Бронирование тренировки — FitMatch" }] }),
  validateSearch: search,
  component: BookingPage,
});

function BookingPage() {
  const { trainerId, serviceId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [tid, setTid] = useState(trainerId ?? "");
  const [slotId, setSlotId] = useState<string>("");
  const [svcId, setSvcId] = useState<string>(serviceId ?? "");

  const { data: services } = useQuery({
    queryKey: ["services", tid],
    enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, price, duration_min")
        .eq("trainer_id", tid)
        .order("price");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: slots } = useQuery({
    queryKey: ["slots", "free", tid],
    enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("id, start_at, end_at")
        .eq("trainer_id", tid)
        .eq("is_booked", false)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: { trainer_id: string; scheduled_at: string; notes: string; slot_id: string | null; service_id: string | null; amount: number }) => {
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase.from("bookings").insert({
        client_id: user.id,
        trainer_id: payload.trainer_id,
        scheduled_at: payload.scheduled_at,
        notes: payload.notes,
        slot_id: payload.slot_id,
        service_id: payload.service_id,
        amount: payload.amount,
        status: "pending",
        payment_status: "unpaid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Заявка создана — теперь оплатите её в кабинете");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const trainer = String(fd.get("trainer_id") || tid);
    let when = "";
    let chosenSlot: string | null = null;
    if (slotId) {
      const slot = slots?.find((s) => s.id === slotId);
      if (!slot) {
        setLoading(false);
        return toast.error("Слот не найден");
      }
      when = slot.start_at;
      chosenSlot = slot.id;
    } else {
      when = String(fd.get("scheduled_at") || "");
    }
    if (!trainer || !when) {
      setLoading(false);
      return toast.error("Выберите тренера и слот или дату");
    }
    create.mutate(
      {
        trainer_id: trainer,
        scheduled_at: new Date(when).toISOString(),
        notes: String(fd.get("notes") || ""),
        slot_id: chosenSlot,
        service_id: svcId || null,
        amount: svcId ? Number(services?.find((s) => s.id === svcId)?.price ?? 0) : 0,
      },
      { onSettled: () => setLoading(false) },
    );
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Бронирование тренировки</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trainer_id">ID тренера</Label>
              <Input
                id="trainer_id"
                name="trainer_id"
                value={tid}
                onChange={(e) => { setTid(e.target.value); setSlotId(""); setSvcId(""); }}
                required
              />
              <p className="text-xs text-muted-foreground">Подставляется автоматически из каталога.</p>
            </div>
            {tid && services && services.length > 0 && (
              <div className="space-y-2">
                <Label>Услуга</Label>
                <Select value={svcId} onValueChange={setSvcId}>
                  <SelectTrigger><SelectValue placeholder="Без конкретной услуги" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title} — {s.price} ₽ · {s.duration_min} мин</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tid && slots && slots.length > 0 ? (
              <div className="space-y-2">
                <Label>Доступный слот</Label>
                <Select value={slotId} onValueChange={setSlotId}>
                  <SelectTrigger><SelectValue placeholder="Выберите слот" /></SelectTrigger>
                  <SelectContent>
                    {slots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {new Date(s.start_at).toLocaleString("ru-RU")} — {new Date(s.end_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Дата и время</Label>
                <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required={!slotId} />
                {tid && (
                  <p className="text-xs text-muted-foreground">У этого тренера пока нет свободных слотов — укажите желаемое время.</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Комментарий</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Цели, пожелания…" />
            </div>
            <Button type="submit" className="w-full" disabled={loading || create.isPending}>
              Отправить заявку
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
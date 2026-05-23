import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const search = z.object({ trainerId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({ meta: [{ title: "Бронирование тренировки — FitMatch" }] }),
  validateSearch: search,
  component: BookingPage,
});

function BookingPage() {
  const { trainerId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const create = useMutation({
    mutationFn: async (payload: { trainer_id: string; scheduled_at: string; notes: string }) => {
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase.from("bookings").insert({
        client_id: user.id,
        trainer_id: payload.trainer_id,
        scheduled_at: payload.scheduled_at,
        notes: payload.notes,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Заявка отправлена тренеру");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const tid = String(fd.get("trainer_id") || "");
    const when = String(fd.get("scheduled_at") || "");
    if (!tid || !when) {
      setLoading(false);
      return toast.error("Заполни тренера и дату");
    }
    create.mutate(
      {
        trainer_id: tid,
        scheduled_at: new Date(when).toISOString(),
        notes: String(fd.get("notes") || ""),
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
              <Input id="trainer_id" name="trainer_id" defaultValue={trainerId ?? ""} required />
              <p className="text-xs text-muted-foreground">Подставляется автоматически из каталога.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Дата и время</Label>
              <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required />
            </div>
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
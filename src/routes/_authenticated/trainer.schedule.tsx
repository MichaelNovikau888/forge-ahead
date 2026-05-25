import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trainer/schedule")({
  head: () => ({ meta: [{ title: "Моё расписание — FitMatch" }] }),
  component: TrainerSchedule,
});

function TrainerSchedule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: slots } = useQuery({
    queryKey: ["slots", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("id, start_at, end_at, is_booked")
        .eq("trainer_id", user!.id)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: { start_at: string; end_at: string }) => {
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase.from("availability_slots").insert({
        trainer_id: user.id,
        start_at: payload.start_at,
        end_at: payload.end_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Слот добавлен");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Удалено");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const start = String(fd.get("start_at") || "");
    const end = String(fd.get("end_at") || "");
    if (!start || !end) return toast.error("Укажите время начала и окончания");
    if (new Date(end) <= new Date(start)) return toast.error("Окончание должно быть позже начала");
    create.mutate({
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Моё расписание</h1>
          <p className="text-muted-foreground">Свободные слоты, доступные для бронирования клиентами.</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>{open ? "Отмена" : "Добавить слот"}</Button>
      </div>

      {open && (
        <Card>
          <CardHeader><CardTitle>Новый слот</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_at">Начало</Label>
                  <Input id="start_at" name="start_at" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_at">Окончание</Label>
                  <Input id="end_at" name="end_at" type="datetime-local" required />
                </div>
              </div>
              <Button type="submit" disabled={create.isPending}>Сохранить</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Слоты</CardTitle></CardHeader>
        <CardContent>
          {!slots || slots.length === 0 ? (
            <p className="text-muted-foreground">Пока нет слотов. Добавьте первый, чтобы клиенты смогли записаться.</p>
          ) : (
            <ul className="space-y-3">
              {slots.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{new Date(s.start_at).toLocaleString("ru-RU")}</p>
                    <p className="text-sm text-muted-foreground">до {new Date(s.end_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <Badge variant={s.is_booked ? "default" : "secondary"}>
                    {s.is_booked ? "Забронирован" : "Свободен"}
                  </Badge>
                  {!s.is_booked && (
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)} aria-label="Удалить">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
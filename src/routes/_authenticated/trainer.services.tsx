import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trainer/services")({
  head: () => ({ meta: [{ title: "Мои услуги — FitMatch" }] }),
  component: TrainerServices,
});

function TrainerServices() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: services } = useQuery({
    queryKey: ["services", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, description, duration_min, price, created_at")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: { title: string; description: string; duration_min: number; price: number }) => {
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase.from("services").insert({ ...payload, trainer_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Услуга добавлена");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Удалено");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      duration_min: Number(fd.get("duration_min") || 60),
      price: Number(fd.get("price") || 0),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Мои услуги</h1>
          <p className="text-muted-foreground">Создавайте пакеты тренировок, которые увидят клиенты.</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>{open ? "Отмена" : "Добавить услугу"}</Button>
      </div>

      {open && (
        <Card>
          <CardHeader><CardTitle>Новая услуга</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input id="title" name="title" required placeholder="Персональная тренировка" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration_min">Длительность (мин)</Label>
                  <Input id="duration_min" name="duration_min" type="number" min={15} step={5} defaultValue={60} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Цена (₽)</Label>
                  <Input id="price" name="price" type="number" min={0} step={100} defaultValue={2000} required />
                </div>
              </div>
              <Button type="submit" disabled={create.isPending}>Сохранить</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Список услуг</CardTitle></CardHeader>
        <CardContent>
          {!services || services.length === 0 ? (
            <p className="text-muted-foreground">Пока ничего не добавлено.</p>
          ) : (
            <ul className="space-y-3">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{s.title}</p>
                    {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{s.duration_min} мин · {Number(s.price).toLocaleString("ru-RU")} ₽</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)} aria-label="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
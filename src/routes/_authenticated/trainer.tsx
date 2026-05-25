import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { trainerBookingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer")({
  head: () => ({ meta: [{ title: "Кабинет тренера — FitMatch" }] }),
  component: TrainerDashboard,
});

function TrainerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: bookings } = useQuery({ ...trainerBookingsQuery(user?.id ?? ""), enabled: !!user });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "confirmed" | "completed" | "cancelled" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Статус обновлён");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Кабинет тренера</h1>
        <p className="text-muted-foreground">Заявки клиентов и расписание.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/trainer/services"><Button variant="outline">Мои услуги</Button></Link>
        <Link to="/trainer/schedule"><Button variant="outline">Расписание</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Заявки клиентов</CardTitle></CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <p className="text-muted-foreground">Пока нет заявок.</p>
          ) : (
            <ul className="space-y-3">
              {bookings.map((b) => {
                const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                return (
                  <li key={b.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{profile?.full_name ?? "Клиент"}</p>
                      <p className="text-sm text-muted-foreground">{new Date(b.scheduled_at).toLocaleString("ru-RU")}</p>
                    </div>
                    <Badge variant="secondary">{b.status}</Badge>
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}>Подтвердить</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}>Отклонить</Button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}>Завершить</Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
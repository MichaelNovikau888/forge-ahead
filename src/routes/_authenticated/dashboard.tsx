import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { myBookingsQuery } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Мой кабинет — FitMatch" }] }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const { user } = useAuth();
  const { data: bookings } = useQuery({ ...myBookingsQuery(user?.id ?? ""), enabled: !!user });
  const qc = useQueryClient();

  const pay = useMutation({
    mutationFn: async (id: string) => {
      // MVP: эмуляция оплаты. Реальная интеграция Stripe — следующим шагом.
      const meeting = `https://meet.fitmatch.app/room/${id.slice(0, 8)}`;
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: "paid", status: "confirmed", meeting_url: meeting })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Оплачено! Ссылка на онлайн-тренировку доступна.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Кабинет клиента</h1>
        <p className="text-muted-foreground">Твои тренировки и история.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Мои бронирования</CardTitle></CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <p className="text-muted-foreground">Нет бронирований. Выбери тренера в каталоге.</p>
          ) : (
            <ul className="space-y-3">
              {bookings.map((b) => {
                const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{profile?.full_name ?? "Тренер"}</p>
                      <p className="text-sm text-muted-foreground">{new Date(b.scheduled_at).toLocaleString("ru-RU")}</p>
                      {b.amount > 0 && <p className="text-xs text-muted-foreground">Сумма: {b.amount} ₽</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={b.payment_status === "paid" ? "default" : "secondary"}>
                        {b.payment_status === "paid" ? "Оплачено" : "Не оплачено"}
                      </Badge>
                      {b.payment_status !== "paid" && b.status !== "cancelled" && (
                        <Button size="sm" onClick={() => pay.mutate(b.id)} disabled={pay.isPending}>
                          <CreditCard className="h-4 w-4 mr-1" /> Оплатить
                        </Button>
                      )}
                      {b.meeting_url && (
                        <a href={b.meeting_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="secondary"><Video className="h-4 w-4 mr-1" /> Подключиться</Button>
                        </a>
                      )}
                    </div>
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
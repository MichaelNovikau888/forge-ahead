import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { myBookingsQuery } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Мой кабинет — FitMatch" }] }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const { user } = useAuth();
  const { data: bookings } = useQuery({ ...myBookingsQuery(user?.id ?? ""), enabled: !!user });

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
                  <li key={b.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{profile?.full_name ?? "Тренер"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(b.scheduled_at).toLocaleString("ru-RU")}
                      </p>
                    </div>
                    <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status}</Badge>
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
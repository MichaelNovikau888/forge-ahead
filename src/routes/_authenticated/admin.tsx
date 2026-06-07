import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { allTrainersQuery, allBookingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ-панель — FitMatch" }] }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");
  const { data: trainers } = useQuery({ ...allTrainersQuery, enabled: isAdmin });
  const { data: bookings } = useQuery({ ...allBookingsQuery, enabled: isAdmin });

  const toggleApprove = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { error } = await supabase.rpc("admin_set_trainer_approved", {
        _trainer_user_id: id,
        _approved: is_approved,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Готово");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Доступ только для администратора.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Админ-панель</h1>
        <p className="text-muted-foreground">Модерация тренеров и сводка по платформе.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Тренеров</p><p className="text-3xl font-bold">{trainers?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Бронирований</p><p className="text-3xl font-bold">{bookings?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">На модерации</p><p className="text-3xl font-bold">{trainers?.filter((t) => !t.is_approved).length ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Тренеры</CardTitle></CardHeader>
        <CardContent>
          {!trainers?.length ? (
            <p className="text-muted-foreground">Нет тренеров.</p>
          ) : (
            <ul className="space-y-3">
              {trainers.map((t) => {
                const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
                return (
                  <li key={t.user_id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{profile?.full_name ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">{t.specialization} · {t.price_per_hour} ₽/ч</p>
                    </div>
                    <Badge variant={t.is_approved ? "default" : "secondary"}>
                      {t.is_approved ? "Одобрен" : "На модерации"}
                    </Badge>
                    <Button
                      size="sm"
                      variant={t.is_approved ? "outline" : "default"}
                      onClick={() => toggleApprove.mutate({ id: t.user_id, is_approved: !t.is_approved })}
                    >
                      {t.is_approved ? "Снять" : "Одобрить"}
                    </Button>
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
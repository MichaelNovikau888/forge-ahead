import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Clock } from "lucide-react";

export const Route = createFileRoute("/trainers/$id")({
  head: () => ({ meta: [{ title: "Профиль тренера — FitMatch" }] }),
  component: TrainerProfile,
});

function TrainerProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["trainer", id],
    queryFn: async () => {
      const [trainerRes, servicesRes, slotsRes] = await Promise.all([
        supabase
          .from("trainers")
          .select("user_id, specialization, experience_years, price_per_hour, rating, is_approved")
          .eq("user_id", id)
          .maybeSingle(),
        supabase.from("services").select("id, title, description, price, duration_min").eq("trainer_id", id).order("price"),
        supabase
          .from("availability_slots")
          .select("id, start_at, end_at, is_booked")
          .eq("trainer_id", id)
          .eq("is_booked", false)
          .gte("start_at", new Date().toISOString())
          .order("start_at"),
      ]);
      if (trainerRes.error) throw trainerRes.error;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, bio")
        .eq("id", id)
        .maybeSingle();
      return {
        trainer: trainerRes.data,
        profile,
        services: servicesRes.data ?? [],
        slots: slotsRes.data ?? [],
      };
    },
  });

  const go = (serviceId?: string) => {
    if (!user) return navigate({ to: "/auth" });
    navigate({ to: "/booking", search: { trainerId: id, serviceId } });
  };

  const profile = data?.profile;
  const name = profile?.full_name ?? "Тренер";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-12">
        {isLoading && <p className="text-muted-foreground">Загрузка…</p>}
        {!isLoading && !data?.trainer && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Тренер не найден.</CardContent></Card>
        )}
        {data?.trainer && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar className="h-14 w-14"><AvatarFallback>{name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{data.trainer.specialization}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{profile?.bio || "Опытный тренер."}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><Star className="h-4 w-4" /> {data.trainer.rating}</span>
                    <span>{data.trainer.experience_years} лет опыта</span>
                  </div>
                  <div className="font-semibold">{data.trainer.price_per_hour} ₽ / час</div>
                  <Button className="w-full" onClick={() => go()}>Забронировать слот</Button>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>Услуги</CardTitle></CardHeader>
                <CardContent>
                  {data.services.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Тренер ещё не добавил услуги.</p>
                  ) : (
                    <ul className="space-y-3">
                      {data.services.map((s) => (
                        <li key={s.id} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0">
                          <div>
                            <p className="font-medium">{s.title}</p>
                            {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration_min} мин</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{s.price} ₽</p>
                            <Button size="sm" className="mt-2" onClick={() => go(s.id)}>Выбрать</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Свободные слоты</CardTitle></CardHeader>
                <CardContent>
                  {data.slots.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Свободных слотов пока нет.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.slots.slice(0, 24).map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs px-2 py-1">
                          {new Date(s.start_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Link to="/trainers" className="text-sm text-muted-foreground hover:underline">← К каталогу</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
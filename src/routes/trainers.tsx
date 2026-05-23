import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trainersQuery } from "@/lib/queries";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

export const Route = createFileRoute("/trainers")({
  head: () => ({
    meta: [
      { title: "Каталог тренеров — FitMatch" },
      { name: "description", content: "Выбери персонального тренера: специализация, опыт, цена, рейтинг." },
    ],
  }),
  component: TrainersPage,
});

function TrainersPage() {
  const { data: trainers, isLoading } = useQuery(trainersQuery);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Каталог тренеров</h1>
        {isLoading && <p className="text-muted-foreground">Загрузка…</p>}
        {!isLoading && (!trainers || trainers.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Пока нет одобренных тренеров. Будь первым — зарегистрируйся как тренер.
            </CardContent>
          </Card>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers?.map((t) => {
            const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
            const name = profile?.full_name ?? "Тренер";
            return (
              <Card key={t.user_id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{t.specialization}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{profile?.bio || "Опытный тренер."}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1"><Star className="h-4 w-4 text-accent-foreground" /> {t.rating}</span>
                    <span>{t.experience_years} лет опыта</span>
                    <span className="font-semibold">{t.price_per_hour} ₽/ч</span>
                  </div>
                  <Link to="/booking" search={{ trainerId: t.user_id }}>
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Забронировать</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
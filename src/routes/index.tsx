import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Calendar, Dumbbell, Search, Shield, Star, Users } from "lucide-react";
import heroImg from "@/assets/hero-fitness.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitMatch — найди личного фитнес-тренера" },
      { name: "description", content: "Маркетплейс проверенных тренеров. Бронируй персональные тренировки онлайн за минуту." },
      { property: "og:title", content: "FitMatch — найди личного фитнес-тренера" },
      { property: "og:description", content: "Маркетплейс проверенных тренеров. Бронируй персональные тренировки онлайн за минуту." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-semibold">
              MVP · фитнес-платформа
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Найди своего <span className="text-accent">тренера</span> и тренируйся с результатом
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              FitMatch — маркетплейс персональных тренеров и личные кабинеты для клиентов,
              тренеров и администратора. Регистрируйся, выбирай специалиста и бронируй
              тренировку онлайн.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Начать бесплатно
                </Button>
              </Link>
              <Link to="/trainers">
                <Button size="lg" variant="outline">Каталог тренеров</Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="Персональный тренер занимается с клиентом в светлом современном зале"
              width={1536}
              height={1024}
              className="rounded-2xl shadow-2xl w-full h-auto object-cover"
            />
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Как это работает</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: "Выбери тренера", desc: "Просматривай профили, рейтинги и цены." },
              { icon: Calendar, title: "Забронируй слот", desc: "Бронирование тренировки в пару кликов." },
              { icon: Dumbbell, title: "Тренируйся", desc: "Личный кабинет: история, отзывы, прогресс." },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">{title}</h3>
                  <p className="text-muted-foreground text-sm">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="bg-secondary py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Для всех ролей платформы</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Users, title: "Клиенты", desc: "Бронирование тренировок, история занятий, избранные тренеры." },
                { icon: Star, title: "Тренеры", desc: "Профиль, услуги, расписание, заявки клиентов." },
                { icon: Shield, title: "Администратор", desc: "Модерация тренеров, управление пользователями, статистика." },
              ].map(({ icon: Icon, title, desc }) => (
                <Card key={title}>
                  <CardContent className="pt-6 space-y-3">
                    <Icon className="h-8 w-8 text-accent-foreground" />
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <p className="text-muted-foreground text-sm">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Готов начать?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Зарегистрируйся сейчас — клиентом, чтобы найти тренера, или тренером, чтобы получать заявки.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Создать аккаунт
            </Button>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

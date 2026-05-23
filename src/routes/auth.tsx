import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход и регистрация — FitMatch" },
      { name: "description", content: "Войди в FitMatch или создай аккаунт клиента / тренера." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate({ to: "/dashboard" });
  }

  const onSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Добро пожаловать!");
    navigate({ to: "/dashboard" });
  };

  const onSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const fullName = String(fd.get("full_name"));
    const role = String(fd.get("role"));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // If trainer role requested, add it (default 'client' is created by trigger)
    if (role === "trainer" && data.user) {
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: "trainer" });
      await supabase.from("trainers").insert({
        user_id: data.user.id,
        specialization: "Персональный тренинг",
        is_approved: false,
      });
    }
    setLoading(false);
    toast.success("Аккаунт создан! Проверь почту, если требуется подтверждение.");
    navigate({ to: role === "trainer" ? "/trainer" : "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>FitMatch</CardTitle>
          <CardDescription>Войди или создай аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Пароль</Label>
                  <Input id="signin-password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Войти</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Полное имя</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Пароль</Label>
                  <Input id="su-password" name="password" type="password" minLength={6} required />
                </div>
                <div className="space-y-2">
                  <Label>Я регистрируюсь как</Label>
                  <RadioGroup name="role" defaultValue="client" className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="client" id="r-client" />
                      <Label htmlFor="r-client" className="font-normal">Клиент</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="trainer" id="r-trainer" />
                      <Label htmlFor="r-trainer" className="font-normal">Тренер</Label>
                    </div>
                  </RadioGroup>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Создать аккаунт</Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/" className="hover:underline">← на главную</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
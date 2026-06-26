import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

function PasswordInput({ id, name, minLength }: { id: string; name: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} minLength={minLength} required className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

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
  const { user, roles, loading: authLoading, rolesLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<"client" | "trainer">("client");

  useEffect(() => {
    if (!user || authLoading || rolesLoading) return;
    navigate({
      to: roles.includes("admin") ? "/admin" : roles.includes("trainer") ? "/trainer" : "/dashboard",
      replace: true,
    });
  }, [user, roles, authLoading, rolesLoading, navigate]);

  const onSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Добро пожаловать!");
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    let target: "/trainer" | "/dashboard" = "/dashboard";
    if (uid) {
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roles = (rolesData ?? []).map((r) => r.role);
      if (roles.includes("trainer") && !roles.includes("admin")) target = "/trainer";
    }
    navigate({ to: target });
  };

  const onSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const fullName = String(fd.get("full_name"));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, role },
      },
    });
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }
    setSubmitting(false);
    toast.success("Аккаунт создан!");
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
                  <PasswordInput id="signin-password" name="password" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>Войти</Button>
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
                  <PasswordInput id="su-password" name="password" minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Я регистрируюсь как</Label>
                  <RadioGroup name="role" value={role} onValueChange={(v) => setRole(v as "client" | "trainer")} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="client" id="r-client" />
                      <Label htmlFor="r-client" className="font-normal">Клиент</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="trainer" id="r-trainer" />
                      <Label htmlFor="r-trainer" className="font-normal">Тренер</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">Выбрано: <span className="font-medium">{role === "trainer" ? "Тренер" : "Клиент"}</span></p>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>Создать аккаунт</Button>
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
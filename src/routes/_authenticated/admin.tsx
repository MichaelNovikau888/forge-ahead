import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { allTrainersQuery, allBookingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Send, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
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
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");
  const { data: trainers } = useQuery({ ...allTrainersQuery, enabled: isAdmin });
  const { data: bookings } = useQuery({ ...allBookingsQuery, enabled: isAdmin });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data: base, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const { data: contact } = await supabase.rpc("get_profile_contact", { _user_id: user!.id });
      const c = Array.isArray(contact) ? contact[0] : contact;
      return { ...(base ?? {}), phone: c?.phone ?? null, telegram: c?.telegram ?? null, whatsapp: c?.whatsapp ?? null };
    },
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", telegram: "", whatsapp: "", avatar_url: "" });
  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      telegram: profile.telegram ?? "",
      whatsapp: profile.whatsapp ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      setEditing(false);
      toast.success("Профиль обновлён");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Мой профиль</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Отмена" : "Редактировать"}
          </Button>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ""} />
                <AvatarFallback>{(profile?.full_name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 text-sm">
                <p className="text-lg font-semibold">{profile?.full_name ?? "—"}</p>
                <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {user?.email}</p>
                <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {profile?.phone ?? "—"}</p>
                <p className="flex items-center gap-2 text-muted-foreground"><Send className="h-4 w-4" /> Telegram: {profile?.telegram ?? "—"}</p>
                <p className="flex items-center gap-2 text-muted-foreground"><MessageCircle className="h-4 w-4" /> WhatsApp: {profile?.whatsapp ?? "—"}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Ссылка на фото</Label>
                <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>ФИО</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Telegram</Label>
                <Input value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+7..." />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>Сохранить</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
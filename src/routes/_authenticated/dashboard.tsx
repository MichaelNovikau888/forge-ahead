import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { myBookingsQuery, trainersQuery } from "@/lib/queries";
import { createMeetingForBooking } from "@/lib/daily.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, CreditCard, Mail, Phone, Send, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Мой кабинет — FitMatch" }] }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const isTrainer = roles.includes("trainer");
  useEffect(() => {
    if (isTrainer && !isAdmin) {
      navigate({ to: "/trainer", replace: true });
    }
  }, [isTrainer, isAdmin, navigate]);
  const { data: bookings } = useQuery({ ...myBookingsQuery(user?.id ?? ""), enabled: !!user });
  const { data: trainers } = useQuery(trainersQuery);
  const qc = useQueryClient();
  const createMeeting = useServerFn(createMeetingForBooking);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: base, error: baseErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (baseErr) throw baseErr;
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

  const pay = useMutation({
    mutationFn: async (id: string) => {
      const { url } = await createMeeting({ data: { bookingId: id } });
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: "paid", status: "confirmed", meeting_url: url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Оплачено! Ссылка на онлайн-тренировку доступна.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // DEV: создаём комнату Daily.co без оплаты для тестирования
  const joinDev = useMutation({
    mutationFn: async (id: string) => {
      const { url } = await createMeeting({ data: { bookingId: id } });
      return url;
    },
    onSuccess: (url) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      window.open(url, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDevBooking = useMutation({
    mutationFn: async (trainerId: string) => {
      if (!user) throw new Error("Не авторизован");
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .insert({ client_id: user.id, trainer_id: trainerId, scheduled_at: scheduledAt, status: "pending", payment_status: "unpaid", amount: 0 })
        .select("id")
        .single();
      if (error) throw error;
      const { url } = await createMeeting({ data: { bookingId: data.id } });
      return url;
    },
    onSuccess: (url) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      window.open(url, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{isAdmin ? "Кабинет администратора" : "Кабинет клиента"}</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Управление платформой и сводка." : "Твои тренировки и история."}
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Профиль</CardTitle>
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
                      {b.meeting_url ? (
                        <a href={b.meeting_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="secondary"><Video className="h-4 w-4 mr-1" /> Подключиться</Button>
                        </a>
                      ) : (
                        b.status !== "cancelled" && (
                          <Button size="sm" variant="secondary" onClick={() => joinDev.mutate(b.id)} disabled={joinDev.isPending}>
                            <Video className="h-4 w-4 mr-1" /> Подключиться (dev)
                          </Button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Тренеры для теста</CardTitle></CardHeader>
        <CardContent>
          {!trainers || trainers.length === 0 ? (
            <p className="text-muted-foreground">Тренеры пока не найдены.</p>
          ) : (
            <ul className="space-y-3">
              {trainers.map((trainer) => {
                const trainerProfile = Array.isArray(trainer.profiles) ? trainer.profiles[0] : trainer.profiles;
                return (
                  <li key={trainer.user_id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{trainerProfile?.full_name ?? "Тренер"}</p>
                      <p className="text-sm text-muted-foreground">{trainer.specialization} · {trainer.price_per_hour} ₽/ч</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link to="/trainers/$id" params={{ id: trainer.user_id }}>
                        <Button size="sm" variant="outline">Профиль</Button>
                      </Link>
                      <Button size="sm" variant="secondary" onClick={() => createDevBooking.mutate(trainer.user_id)} disabled={createDevBooking.isPending}>
                        <Video className="h-4 w-4 mr-1" /> Подключиться (dev)
                      </Button>
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
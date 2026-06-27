import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trainerBookingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createMeetingForBooking } from "@/lib/daily.functions";
import { Video, Mail, Phone, Send, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/trainer")({
  head: () => ({ meta: [{ title: "Кабинет тренера — FitMatch" }] }),
  component: TrainerDashboard,
});

function TrainerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: bookings } = useQuery({ ...trainerBookingsQuery(user?.id ?? ""), enabled: !!user });
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

  const [editingProfile, setEditingProfile] = useState(false);
  const [pform, setPform] = useState({ full_name: "", phone: "", telegram: "", whatsapp: "", avatar_url: "" });
  useEffect(() => {
    if (profile) setPform({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      telegram: profile.telegram ?? "",
      whatsapp: profile.whatsapp ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(pform).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      setEditingProfile(false);
      toast.success("Профиль обновлён");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ["trainer-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainers")
        .select("specialization, experience_years, price_per_hour, bio, is_approved")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ specialization: "", experience_years: 0, price_per_hour: 0, bio: "" });
  useEffect(() => {
    if (trainerProfile) {
      setForm({
        specialization: trainerProfile.specialization ?? "",
        experience_years: Number(trainerProfile.experience_years ?? 0),
        price_per_hour: Number(trainerProfile.price_per_hour ?? 0),
        bio: trainerProfile.bio ?? "",
      });
    }
  }, [trainerProfile]);

  const saveTrainer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trainers").update(form).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainer-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["trainers"] });
      setEditing(false);
      toast.success("Профиль обновлён");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "confirmed" | "completed" | "cancelled" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Статус обновлён");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Кабинет тренера</h1>
        <p className="text-muted-foreground">Заявки клиентов и расписание.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/trainer/services"><Button variant="outline">Мои услуги</Button></Link>
        <Link to="/trainer/schedule"><Button variant="outline">Расписание</Button></Link>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Личные данные</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditingProfile((v) => !v)}>
            {editingProfile ? "Отмена" : "Редактировать"}
          </Button>
        </CardHeader>
        <CardContent>
          {!editingProfile ? (
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
                <Input value={pform.avatar_url} onChange={(e) => setPform({ ...pform, avatar_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>ФИО</Label>
                <Input value={pform.full_name} onChange={(e) => setPform({ ...pform, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input value={pform.phone} onChange={(e) => setPform({ ...pform, phone: e.target.value })} />
              </div>
              <div>
                <Label>Telegram</Label>
                <Input value={pform.telegram} onChange={(e) => setPform({ ...pform, telegram: e.target.value })} placeholder="@username" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={pform.whatsapp} onChange={(e) => setPform({ ...pform, whatsapp: e.target.value })} placeholder="+7..." />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>Сохранить</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Профиль тренера</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={trainerProfile?.is_approved ? "default" : "secondary"}>
              {trainerProfile?.is_approved ? "Одобрен" : "На модерации"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Отмена" : "Редактировать"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Специализация:</span> {trainerProfile?.specialization || "—"}</div>
              <div><span className="text-muted-foreground">Тариф:</span> {trainerProfile?.price_per_hour ?? 0} ₽/час</div>
              <div><span className="text-muted-foreground">Опыт:</span> {trainerProfile?.experience_years ?? 0} лет</div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">О себе:</span> {trainerProfile?.bio || "—"}</div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Специализация</Label>
                <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <div>
                <Label>Тариф (₽ / час)</Label>
                <Input type="number" min={0} step={100} value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Опыт (лет)</Label>
                <Input type="number" min={0} step={1} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>О себе</Label>
                <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => saveTrainer.mutate()} disabled={saveTrainer.isPending}>Сохранить</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Заявки клиентов</CardTitle></CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <p className="text-muted-foreground">Пока нет заявок.</p>
          ) : (
            <ul className="space-y-3">
              {bookings.map((b) => {
                const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                return (
                  <li key={b.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{profile?.full_name ?? "Клиент"}</p>
                      <p className="text-sm text-muted-foreground">{new Date(b.scheduled_at).toLocaleString("ru-RU")}</p>
                    </div>
                    <Badge variant="secondary">{b.status}</Badge>
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
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}>Подтвердить</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}>Отклонить</Button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}>Завершить</Button>
                    )}
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
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDecision | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDecision | null; error: Error | null }>;
};
type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type AuthorizationDecision = { redirect_url?: string; redirect_to?: string };

function oauthClient(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthClient().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader><CardTitle>Не удалось загрузить запрос</CardTitle></CardHeader>
        <CardContent>{String((error as Error)?.message ?? error)}</CardContent>
      </Card>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "внешнее приложение";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const call = approve ? oauthClient().approveAuthorization : oauthClient().denyAuthorization;
    const { data, error } = await call(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("Сервер авторизации не вернул адрес возврата."); return; }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Подключить {clientName} к FitMatch</CardTitle>
          <CardDescription>
            {clientName} сможет вызывать инструменты FitMatch от вашего имени. Права доступа к данным по-прежнему определяются политиками приложения (RLS).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {details?.client?.redirect_uri && (
            <p className="text-xs text-muted-foreground break-all">
              Redirect URI: {details.client.redirect_uri}
            </p>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Разрешить</Button>
            <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Отменить</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
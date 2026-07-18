import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in FitMatch user's profile (name, avatar, contacts) and roles.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const uid = ctx.getUserId();
    const supabase = supabaseForUser(ctx);
    const [{ data: profile }, { data: rolesData }, { data: contact }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.rpc("get_profile_contact", { _user_id: uid }),
    ]);
    const c = Array.isArray(contact) ? contact[0] : contact;
    const result = {
      email: ctx.getUserEmail(),
      profile: profile ?? null,
      roles: (rolesData ?? []).map((r) => r.role),
      contact: c ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
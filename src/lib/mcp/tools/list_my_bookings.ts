import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_bookings",
  title: "List my bookings",
  description:
    "List FitMatch bookings for the signed-in user (both as client and as trainer). Ordered by scheduled time, newest first.",
  inputSchema: {
    status: z
      .enum(["pending", "confirmed", "completed", "cancelled"])
      .optional()
      .describe("Optional status filter."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const uid = ctx.getUserId();
    let q = supabaseForUser(ctx)
      .from("bookings")
      .select("id, client_id, trainer_id, service_id, scheduled_at, status, amount, payment_status, meeting_url, notes")
      .or(`client_id.eq.${uid},trainer_id.eq.${uid}`)
      .order("scheduled_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { bookings: data ?? [] },
    };
  },
});
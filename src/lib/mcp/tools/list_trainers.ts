import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_trainers",
  title: "List approved trainers",
  description:
    "List public FitMatch trainers who have been approved by the moderator. Optionally filter by specialization keyword.",
  inputSchema: {
    specialization: z.string().trim().min(1).optional().describe("Optional keyword to match against trainer specialization."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum number of trainers to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ specialization, limit }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Server misconfigured: Supabase env missing" }], isError: true };
    }
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    let query = supabase
      .from("trainers")
      .select("user_id, specialization, experience_years, price_per_hour, bio")
      .eq("is_approved", true)
      .limit(limit ?? 20);
    if (specialization) query = query.ilike("specialization", `%${specialization}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { trainers: data ?? [] },
    };
  },
});
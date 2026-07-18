import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTrainersTool from "./tools/list_trainers";
import listMyBookingsTool from "./tools/list_my_bookings";
import getMyProfileTool from "./tools/get_my_profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fitmatch-mcp",
  title: "FitMatch MCP",
  version: "0.1.0",
  instructions:
    "Tools for FitMatch — an online fitness platform connecting clients and trainers. Use `list_trainers` to browse approved trainers, `list_my_bookings` to see the signed-in user's bookings (as client or trainer), and `get_my_profile` to read their profile and roles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTrainersTool, listMyBookingsTool, getMyProfileTool],
});
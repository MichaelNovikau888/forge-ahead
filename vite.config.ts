// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Inside Lovable's sandbox/prod-deploy build the nitro preset is forced to
// Cloudflare regardless of what we pass here, so this override only takes
// effect when building outside Lovable (e.g. on Vercel CI from the linked
// GitHub repo). This keeps the Lovable preview working while producing a
// Vercel-compatible build output on Vercel.
export default defineConfig({
  nitro: {
    preset: "vercel",
  },
});

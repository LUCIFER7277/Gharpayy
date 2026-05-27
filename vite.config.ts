// Set Nitro preset BEFORE any plugins load
if (process.env.VERCEL) {
  process.env.SERVER_PRESET = "vercel";
  process.env.NITRO_PRESET = "vercel";
}

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = !!process.env.VERCEL;

export default defineConfig({
  // Disable Cloudflare plugin completely on Vercel
  cloudflare: isVercel ? false : undefined,
  // Explicitly set server preset for TanStack Start
  tanstackStart: isVercel
    ? {
        server: {
          preset: "vercel",
        },
      }
    : undefined,
});

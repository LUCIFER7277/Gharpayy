import { defineConfig } from "@lovable.dev/vite-tanstack-config";

if (process.env.VERCEL) {
  process.env.SERVER_PRESET = "vercel";
  process.env.NITRO_PRESET = "vercel";
}

export default defineConfig({
  cloudflare: process.env.VERCEL ? false : undefined,
});

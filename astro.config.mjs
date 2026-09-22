// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://dreamax.pages.dev",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !["/magic-corner/", "/machine-learning/", "/fieldwork/roadmap/"].some(
          (path) => new URL(page).pathname.startsWith(path),
        ),
    }),
  ],
  devToolbar: { enabled: false },
});

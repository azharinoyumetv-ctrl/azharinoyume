import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Azyume Cut AI",
    short_name: "Azyume",
    description: "Automated video production, delivery, and administration.",
    start_url: "/en/portal",
    display: "standalone",
    background_color: "#050508",
    theme_color: "#d4a017",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

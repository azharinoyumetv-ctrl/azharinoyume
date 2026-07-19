import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Azyume Cut AI",
    short_name: "Azyume",
    description: "AI-assisted video editing, credits, delivery, and administration.",
    start_url: "/en/portal",
    display: "standalone",
    background_color: "#050508",
    theme_color: "#d4a017",
  };
}

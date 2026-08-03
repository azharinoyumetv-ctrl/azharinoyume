import type { Metadata } from "next";
import Editor360Client from "@/components/editor360/Editor360Client";
import { notFound } from "next/navigation";
import { isFeatureEnabled } from "@/lib/features";

export const metadata: Metadata = {
  title: "360 Reframe Studio | Azyume Cut AI",
  description:
    "Turn spherical footage into directed flat video with an interactive virtual camera.",
};

export const dynamic = "force-dynamic";

export default async function Editor360Page() {
  if (!(await isFeatureEnabled("r_and_d_360_video"))) notFound();
  return <Editor360Client />;
}

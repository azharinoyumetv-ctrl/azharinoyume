import type { Metadata } from "next";
import Editor360Client from "@/components/editor360/Editor360Client";

export const metadata: Metadata = {
  title: "360 Reframe Studio | Azyume Cut AI",
  description:
    "Turn spherical footage into directed flat video with an interactive virtual camera.",
};

export default function Editor360Page() {
  return <Editor360Client />;
}

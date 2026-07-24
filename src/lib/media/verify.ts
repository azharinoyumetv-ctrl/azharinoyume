import { probeVideoAtUrl } from "@/lib/origin/client";
import { getSignedDownloadUrl } from "@/lib/storage/r2";

export async function probeVideo(key: string) {
  const url = await getSignedDownloadUrl(key, 15 * 60);
  return probeVideoAtUrl(url);
}

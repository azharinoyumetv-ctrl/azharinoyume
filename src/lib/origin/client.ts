type OriginRequestOptions = {
  responseType?: "json" | "bytes";
};

function originConfig() {
  const baseUrl = process.env.ORIGIN_SERVICE_URL || "http://127.0.0.1:4200";
  const secret = process.env.ORIGIN_SERVICE_SECRET || process.env.RENDER_SERVICE_SECRET;
  if (!secret) throw new Error("ORIGIN_SERVICE_SECRET is required");
  return { baseUrl: baseUrl.replace(/\/$/, ""), secret };
}

async function originRequest<T>(
  path: string,
  body: unknown,
  options: OriginRequestOptions = {},
): Promise<T> {
  const { baseUrl, secret } = originConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-origin-secret": secret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Origin service rejected ${path}: ${response.status} ${message.slice(0, 300)}`);
  }

  if (options.responseType === "bytes") {
    return new Uint8Array(await response.arrayBuffer()) as T;
  }
  return response.json() as Promise<T>;
}

export function enqueueRenderJob(input: {
  orderId: string;
  renderId: string;
  reservationId: string;
}) {
  return originRequest<{ queued: true; jobId: string }>("/internal/render-jobs", input);
}

export function probeVideoAtUrl(url: string) {
  return originRequest<{
    durationMs: number;
    metadata: unknown;
  }>("/internal/media/probe", { url });
}

export function renderInvoicePdf(html: string) {
  return originRequest<Uint8Array>("/internal/invoice/pdf", { html }, { responseType: "bytes" });
}

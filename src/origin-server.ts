import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getRenderQueue } from "@/lib/queue/queues";

const execFileAsync = promisify(execFile);
const port = Number(process.env.ORIGIN_BRIDGE_PORT || 4200);
const secret = process.env.ORIGIN_SERVICE_SECRET || process.env.RENDER_SERVICE_SECRET || "";

function isAuthorized(request: IncomingMessage) {
  const supplied = request.headers["x-origin-secret"];
  if (!secret || typeof supplied !== "string") return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 2 * 1024 * 1024) throw new Error("Request body exceeds 2 MB");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  const path = new URL(request.url || "/", "http://localhost").pathname;
  if (request.method === "GET" && path === "/health") {
    return json(response, 200, { status: "ok" });
  }
  if (request.method !== "POST" || !isAuthorized(request)) {
    return json(response, 401, { error: "Unauthorized" });
  }

  const body = await readJson(request);
  if (path === "/internal/render-jobs") {
    const orderId = String(body.orderId || "");
    const renderId = String(body.renderId || "");
    const reservationId = String(body.reservationId || "");
    if (!orderId || !renderId || !reservationId) return json(response, 400, { error: "Missing render job fields" });
    await getRenderQueue().add(
      "render-video",
      { orderId, renderId, reservationId },
      { jobId: renderId },
    );
    return json(response, 202, { queued: true, jobId: renderId });
  }

  if (path === "/internal/media/probe") {
    const url = String(body.url || "");
    if (!url.startsWith("https://")) return json(response, 400, { error: "A signed HTTPS media URL is required" });
    const { stdout } = await execFileAsync(
      process.env.FFPROBE_PATH || "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration,format_name:stream=codec_type,codec_name,width,height",
        "-of", "json",
        url,
      ],
      { timeout: 60_000, maxBuffer: 1024 * 1024 },
    );
    const result = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string }>;
    };
    const duration = Number(result.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0 || !result.streams?.some((stream) => stream.codec_type === "video")) {
      return json(response, 422, { error: "Uploaded file is not a valid video" });
    }
    return json(response, 200, { durationMs: Math.ceil(duration * 1000), metadata: result });
  }

  if (path === "/internal/invoice/pdf") {
    const html = String(body.html || "");
    if (!html || html.length > 1_500_000) return json(response, 400, { error: "Invalid invoice HTML" });
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
      });
      response.writeHead(200, {
        "content-type": "application/pdf",
        "content-length": String(pdf.byteLength),
      });
      response.end(Buffer.from(pdf));
    } finally {
      await browser.close();
    }
    return;
  }

  return json(response, 404, { error: "Not found" });
}

export function startOriginServer() {
  if (!secret) throw new Error("ORIGIN_SERVICE_SECRET is required");
  const server = createServer((request, response) => {
    handle(request, response).catch((error) => {
      console.error("[origin] Request failed:", error);
      if (!response.headersSent) json(response, 500, { error: "Origin request failed" });
      else response.end();
    });
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`[origin] Internal bridge listening on 127.0.0.1:${port}`);
  });
  return server;
}

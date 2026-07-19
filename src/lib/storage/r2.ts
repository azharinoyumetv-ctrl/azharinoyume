import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME!;

export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return key;
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: expiresInSeconds });
}

export async function getSignedUploadUrl(key: string, contentType: string, expiresInSeconds = 3600) {
  return getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), { expiresIn: expiresInSeconds });
}

export async function deleteFromR2(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function createMultipartUpload(key: string, contentType: string) {
  const result = await r2.send(new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }));
  if (!result.UploadId) throw new Error("R2 did not create an upload ID");
  return result.UploadId;
}

export async function getSignedPartUrl(key: string, uploadId: string, partNumber: number, expiresInSeconds = 900) {
  return getSignedUrl(r2, new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn: expiresInSeconds });
}

export async function completeMultipartUpload(key: string, uploadId: string, parts: { partNumber: number; etag: string }[]) {
  return r2.send(new CompleteMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts.sort((a, b) => a.partNumber - b.partNumber).map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })) } }));
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  await r2.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
}

export async function headR2Object(key: string) {
  return r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function objectExists(key: string) {
  try { await headR2Object(key); return true; } catch { return false; }
}

// R2 key helpers
export const R2Keys = {
  rawUpload: (customerId: string, orderId: string, filename: string) =>
    `customer_uploads/${customerId}/${orderId}/raw/${filename}`,
  reference: (customerId: string, orderId: string, filename: string) =>
    `customer_uploads/${customerId}/${orderId}/references/${filename}`,
  brief: (orderId: string) => `orders/${orderId}/brief/edit_brief.json`,
  draft: (orderId: string, version: number) => `orders/${orderId}/drafts/draft_v${version}.mp4`,
  final: (orderId: string, format = "mp4") => `orders/${orderId}/final/final_delivery.${format}`,
  captions: (orderId: string) => `orders/${orderId}/captions/subtitles.srt`,
  thumbnail: (orderId: string) => `orders/${orderId}/thumbnails/thumbnail.jpg`,
  invoice: (invoiceId: string) => `invoices/${invoiceId}/invoice.pdf`,
  showcase: (showcaseId: string, type: "clip" | "thumb") =>
    `public_showcase/${showcaseId}/${type === "clip" ? "preview_clip.mp4" : "thumbnail.jpg"}`,
  log: (orderId: string, filename: string) => `internal_logs/${orderId}/${filename}`,
  accountingExport: (year: number, month: number, filename: string) =>
    `accounting_exports/${year}/${String(month).padStart(2, "0")}/${filename}`,
};

import "server-only";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
let client: S3Client | undefined;
function storage() {
  const { STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY } = process.env;
  if (!STORAGE_ENDPOINT || !STORAGE_BUCKET || !STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY) throw new Error("Private report storage is not configured.");
  client ??= new S3Client({ endpoint: STORAGE_ENDPOINT, region: STORAGE_REGION || "auto", credentials: { accessKeyId: STORAGE_ACCESS_KEY, secretAccessKey: STORAGE_SECRET_KEY }, forcePathStyle: true });
  return { client, bucket: STORAGE_BUCKET };
}
export async function putPrivatePdf(key: string, body: Buffer) { const s = storage(); await s.client.send(new PutObjectCommand({ Bucket: s.bucket, Key: key, Body: body, ContentType: "application/pdf", ContentDisposition: "attachment" })); }
export async function signedPrivateUploadUrl(key: string, studentId: string, periodId: string, sizeBytes: number) { const s = storage(); return getSignedUrl(s.client, new PutObjectCommand({ Bucket: s.bucket, Key: key, ContentType: "application/pdf", ContentLength: sizeBytes, Metadata: { studentid: studentId, periodid: periodId } }), { expiresIn: 120 }); }
export async function inspectPendingPdf(key: string) { const s = storage(); const head = await s.client.send(new HeadObjectCommand({ Bucket: s.bucket, Key: key })); const range = await s.client.send(new GetObjectCommand({ Bucket: s.bucket, Key: key, Range: "bytes=0-7" })); const prefix = range.Body ? await range.Body.transformToByteArray() : new Uint8Array(); return { sizeBytes: head.ContentLength ?? 0, contentType: head.ContentType ?? "", studentId: head.Metadata?.studentid ?? "", periodId: head.Metadata?.periodid ?? "", signatureValid: prefix.length >= 5 && Buffer.from(prefix).subarray(0, 5).toString("ascii") === "%PDF-" }; }
export async function promotePendingPdf(pendingKey: string, finalKey: string) { const s = storage(); const source = `${s.bucket}/${pendingKey.split("/").map(encodeURIComponent).join("/")}`; await s.client.send(new CopyObjectCommand({ Bucket: s.bucket, Key: finalKey, CopySource: source, ContentType: "application/pdf", ContentDisposition: "attachment", MetadataDirective: "REPLACE" })); await s.client.send(new DeleteObjectCommand({ Bucket: s.bucket, Key: pendingKey })); }
export async function signedPrivatePdfUrl(key: string) { const s = storage(); return getSignedUrl(s.client, new GetObjectCommand({ Bucket: s.bucket, Key: key, ResponseContentType: "application/pdf", ResponseContentDisposition: "inline" }), { expiresIn: 60 }); }
export async function deletePrivatePdf(key: string) { const s = storage(); await s.client.send(new DeleteObjectCommand({ Bucket: s.bucket, Key: key })); }

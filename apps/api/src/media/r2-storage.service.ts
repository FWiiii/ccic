import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Injectable } from "@nestjs/common";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type CreateUploadSignOptions = {
  fileName: string;
  contentType?: string;
};

export type UploadSignResult = {
  bucket: string;
  objectKey: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  publicUrl: string;
  expiresIn: number;
};

type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  publicBaseUrl: string;
  uploadPrefix: string;
  expiresIn: number;
};

const DEFAULT_UPLOAD_PREFIX = "uploads";
const DEFAULT_SIGN_EXPIRES_SECONDS = 300;
const MIN_SIGN_EXPIRES_SECONDS = 30;
const MAX_SIGN_EXPIRES_SECONDS = 3600;
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizePrefix = (value: string) => {
  const cleaned = value.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return cleaned ? `${cleaned}/` : "";
};

const toExpiresInSeconds = (value: unknown) => {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return DEFAULT_SIGN_EXPIRES_SECONDS;
  }

  return Math.min(MAX_SIGN_EXPIRES_SECONDS, Math.max(MIN_SIGN_EXPIRES_SECONDS, Math.floor(raw)));
};

const encodeObjectKey = (value: string) =>
  value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const tryDecodeObjectKey = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const extensionByContentType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

const resolveExtension = (fileName: string, contentType: string) => {
  const ext = extname(fileName).trim().toLowerCase();
  if (ext && ext.length <= 10) {
    return ext;
  }

  return extensionByContentType[contentType.toLowerCase()] ?? ".bin";
};

@Injectable()
export class R2StorageService {
  private client: S3Client | null = null;
  private clientKey = "";

  private readConfig(): R2Config {
    const accountId = normalizeText(process.env.R2_ACCOUNT_ID);
    const bucket = normalizeText(process.env.R2_BUCKET);
    const accessKeyId = normalizeText(process.env.R2_ACCESS_KEY_ID);
    const secretAccessKey = normalizeText(process.env.R2_SECRET_ACCESS_KEY);

    const missing = [
      !accountId ? "R2_ACCOUNT_ID" : "",
      !bucket ? "R2_BUCKET" : "",
      !accessKeyId ? "R2_ACCESS_KEY_ID" : "",
      !secretAccessKey ? "R2_SECRET_ACCESS_KEY" : "",
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new Error(`R2 is not configured: missing ${missing.join(", ")}`);
    }

    const endpoint =
      normalizeText(process.env.R2_S3_ENDPOINT) || `https://${accountId}.r2.cloudflarestorage.com`;
    const publicBaseUrl =
      normalizeText(process.env.R2_PUBLIC_BASE_URL) || `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;
    const uploadPrefix = normalizePrefix(normalizeText(process.env.R2_UPLOAD_PREFIX) || DEFAULT_UPLOAD_PREFIX);
    const expiresIn = toExpiresInSeconds(process.env.R2_SIGN_EXPIRES_SECONDS);

    return {
      accountId,
      bucket,
      accessKeyId,
      secretAccessKey,
      endpoint,
      publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
      uploadPrefix,
      expiresIn,
    };
  }

  private getClient(config: R2Config): S3Client {
    const nextClientKey = `${config.endpoint}|${config.accessKeyId}|${config.secretAccessKey}`;
    if (this.client && this.clientKey === nextClientKey) {
      return this.client;
    }

    this.client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.clientKey = nextClientKey;
    return this.client;
  }

  async createUploadSign(options: CreateUploadSignOptions): Promise<UploadSignResult> {
    const config = this.readConfig();
    const fileName = normalizeText(options.fileName);
    const contentType = normalizeText(options.contentType) || DEFAULT_CONTENT_TYPE;

    if (!fileName) {
      throw new Error("fileName is required");
    }

    const ext = resolveExtension(fileName, contentType);
    const dateText = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const objectKey = `${config.uploadPrefix}${dateText}/${Date.now()}-${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.getClient(config), command, {
      expiresIn: config.expiresIn,
    });

    return {
      bucket: config.bucket,
      objectKey,
      uploadUrl,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      publicUrl: `${config.publicBaseUrl}/${encodeObjectKey(objectKey)}`,
      expiresIn: config.expiresIn,
    };
  }

  private resolveObjectKeyFromUrl(url: string, config: R2Config, bucket: string): string {
    const input = normalizeText(url);
    if (!input) {
      return "";
    }

    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      return "";
    }

    const host = parsed.host.toLowerCase();
    const acceptedHosts = new Set<string>();
    try {
      acceptedHosts.add(new URL(config.publicBaseUrl).host.toLowerCase());
    } catch {
      // ignore malformed public base url
    }
    acceptedHosts.add(`${config.bucket}.${config.accountId}.r2.cloudflarestorage.com`.toLowerCase());
    acceptedHosts.add(`${config.bucket}.r2.dev`.toLowerCase());

    if (!acceptedHosts.has(host)) {
      return "";
    }

    const publicBase = normalizeText(config.publicBaseUrl);
    if (publicBase && input.startsWith(`${publicBase}/`)) {
      return tryDecodeObjectKey(input.slice(publicBase.length + 1));
    }

    const path = parsed.pathname.replace(/^\/+/, "");
    if (!path) {
      return "";
    }

    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) {
      return "";
    }

    // Path-style endpoint: /<bucket>/<object-key>
    if (segments[0] === bucket && segments.length > 1) {
      return tryDecodeObjectKey(segments.slice(1).join("/"));
    }

    return tryDecodeObjectKey(path);
  }

  async deleteObject(options: { objectKey?: string; url?: string; bucket?: string }) {
    const keyFromBody = normalizeText(options.objectKey);
    const rawUrl = normalizeText(options.url);
    if (!keyFromBody && !rawUrl) {
      return { attempted: false as const };
    }

    let config: R2Config;
    try {
      config = this.readConfig();
    } catch (error) {
      if (keyFromBody) {
        throw error;
      }

      return { attempted: false as const };
    }

    const targetBucket = normalizeText(options.bucket) || config.bucket;
    const resolvedObjectKey =
      keyFromBody || this.resolveObjectKeyFromUrl(rawUrl, config, targetBucket);

    if (!resolvedObjectKey) {
      return { attempted: false as const };
    }

    await this.getClient(config).send(
      new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: resolvedObjectKey,
      })
    );

    return {
      attempted: true as const,
      objectKey: resolvedObjectKey,
      bucket: targetBucket,
    };
  }
}

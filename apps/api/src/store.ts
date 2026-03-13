import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Company,
  InspectionReport,
  MediaAsset,
  Product,
  ProductImage,
  TraceCode,
  TraceEvent,
} from "@ccic/shared-types";

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: "SUPER_ADMIN" | "EDITOR" | "VIEWER";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
}

export interface TraceVerifyLog {
  id: string;
  traceCodeId: string;
  verifyAt: string;
  isValid: boolean;
  clientIp?: string;
  userAgent?: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface Database {
  adminUsers: AdminUser[];
  mediaAssets: MediaAsset[];
  companies: Company[];
  products: Product[];
  productImages: ProductImage[];
  inspectionReports: InspectionReport[];
  traceCodes: TraceCode[];
  traceEvents: TraceEvent[];
  traceVerifyLogs: TraceVerifyLog[];
  auditLogs: AuditLog[];
}

const dataPath = path.resolve(process.cwd(), "data", "db.json");

const EMPTY_DB: Database = {
  adminUsers: [],
  mediaAssets: [],
  companies: [],
  products: [],
  productImages: [],
  inspectionReports: [],
  traceCodes: [],
  traceEvents: [],
  traceVerifyLogs: [],
  auditLogs: [],
};

async function ensureDataFile() {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });

  try {
    await fs.access(dataPath);
  } catch {
    await fs.writeFile(dataPath, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

export async function readDb(): Promise<Database> {
  await ensureDataFile();
  const raw = await fs.readFile(dataPath, "utf8");
  return JSON.parse(raw) as Database;
}

export async function writeDb(db: Database): Promise<void> {
  await fs.writeFile(dataPath, JSON.stringify(db, null, 2), "utf8");
}

export async function mutateDb<T>(mutator: (db: Database) => T): Promise<T> {
  const db = await readDb();
  const result = mutator(db);
  await writeDb(db);
  return result;
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return randomUUID();
}

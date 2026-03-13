import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import type { Database } from "./database.types";

const dataPath = path.resolve(process.cwd(), "data", "db.json");

const EMPTY_DB: Database = {
  adminUsers: [],
  mediaAssets: [],
  companies: [],
  products: [],
  productImages: [],
  inspectionReports: [],
  traceCodes: [],
  tracePages: [],
  traceEvents: [],
  traceVerifyLogs: [],
  auditLogs: [],
};

@Injectable()
export class DatabaseService {
  private async ensureDataFile() {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });

    try {
      await fs.access(dataPath);
    } catch {
      await fs.writeFile(dataPath, JSON.stringify(EMPTY_DB, null, 2), "utf8");
    }
  }

  async readDb(): Promise<Database> {
    await this.ensureDataFile();
    const raw = await fs.readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;

    return {
      ...EMPTY_DB,
      ...parsed,
      adminUsers: parsed.adminUsers ?? [],
      mediaAssets: parsed.mediaAssets ?? [],
      companies: parsed.companies ?? [],
      products: parsed.products ?? [],
      productImages: parsed.productImages ?? [],
      inspectionReports: parsed.inspectionReports ?? [],
      traceCodes: parsed.traceCodes ?? [],
      tracePages: parsed.tracePages ?? [],
      traceEvents: parsed.traceEvents ?? [],
      traceVerifyLogs: parsed.traceVerifyLogs ?? [],
      auditLogs: parsed.auditLogs ?? [],
    };
  }

  async writeDb(db: Database): Promise<void> {
    await fs.writeFile(dataPath, JSON.stringify(db, null, 2), "utf8");
  }

  async mutateDb<T>(mutator: (db: Database) => T): Promise<T> {
    const db = await this.readDb();
    const result = mutator(db);
    await this.writeDb(db);
    return result;
  }

  nowIso() {
    return new Date().toISOString();
  }

  newId() {
    return randomUUID();
  }
}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class SessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionCleanupService.name);
  private readonly intervalMinutes = Number(process.env.ADMIN_SESSION_CLEANUP_INTERVAL_MINUTES ?? 60);
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit() {
    if (!Number.isFinite(this.intervalMinutes) || this.intervalMinutes <= 0) {
      this.logger.warn("Admin session cleanup task disabled (invalid interval).");
      return;
    }

    await this.runCleanup("startup");

    const intervalMs = this.intervalMinutes * 60 * 1000;
    this.timer = setInterval(() => {
      void this.runCleanup("interval");
    }, intervalMs);

    this.timer.unref?.();
    this.logger.log(`Admin session cleanup task started (every ${this.intervalMinutes} minute(s)).`);
  }

  onModuleDestroy() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  private async runCleanup(source: "startup" | "interval") {
    try {
      const deleted = await this.databaseService.cleanupExpiredAdminSessions();
      if (deleted > 0) {
        this.logger.log(`Session cleanup (${source}) removed ${deleted} session(s).`);
      }
    } catch (error) {
      this.logger.warn(`Session cleanup (${source}) failed`, error as Error);
    }
  }
}

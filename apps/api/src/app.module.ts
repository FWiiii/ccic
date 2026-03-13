import { Module } from "@nestjs/common";
import { AdminController } from "./admin/admin.controller";
import { AuthController } from "./auth/auth.controller";
import { AdminAuthGuard } from "./auth/admin-auth.guard";
import { TokenService } from "./auth/token.service";
import { DatabaseService } from "./database/database.service";
import { HealthController } from "./health.controller";
import { PublicController } from "./public/public.controller";

@Module({
  imports: [],
  controllers: [HealthController, AuthController, PublicController, AdminController],
  providers: [DatabaseService, TokenService, AdminAuthGuard],
})
export class AppModule {}

import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { DatabaseService } from "../database/database.service";
import { TokenService } from "./token.service";

declare module "express-serve-static-core" {
  interface Request {
    adminUserId?: string;
  }
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly databaseService: DatabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.header("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
    const userId = await this.tokenService.getUserId(token);

    if (!userId) {
      throw new HttpException({ message: "Unauthorized" }, HttpStatus.UNAUTHORIZED);
    }

    const db = await this.databaseService.readDb();
    const user = db.adminUsers.find((item) => item.id === userId && item.status === "ACTIVE");

    if (!user) {
      throw new HttpException({ message: "Invalid user" }, HttpStatus.UNAUTHORIZED);
    }

    req.adminUserId = user.id;
    return true;
  }
}

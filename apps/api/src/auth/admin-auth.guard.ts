import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { DatabaseService } from "../database/database.service";
import { extractBearerToken } from "./auth.util";
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
    const token = extractBearerToken(req.header("authorization"));
    const userId = await this.tokenService.getUserId(token);

    if (!userId) {
      throw new HttpException({ message: "Unauthorized" }, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.databaseService.findActiveAdminUserById(userId);

    if (!user) {
      throw new HttpException({ message: "Invalid user" }, HttpStatus.UNAUTHORIZED);
    }

    req.adminUserId = user.id;
    return true;
  }
}

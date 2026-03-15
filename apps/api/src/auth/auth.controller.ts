import { Body, Controller, HttpException, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { Request } from "express";
import { DatabaseService } from "../database/database.service";
import type { AdminLoginResponse } from "../database/database.types";
import { AdminAuthGuard } from "./admin-auth.guard";
import { extractBearerToken } from "./auth.util";
import { TokenService } from "./token.service";

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const getPasswordHashRounds = () => {
  const raw = Number(process.env.ADMIN_PASSWORD_BCRYPT_COST ?? 12);
  if (!Number.isFinite(raw)) {
    return 12;
  }

  return Math.min(14, Math.max(10, Math.floor(raw)));
};

@Controller("api/admin/auth")
export class AuthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenService: TokenService
  ) {}

  @Post("login")
  async login(@Body() body: Record<string, unknown>) {
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "").trim();

    if (!username || !password) {
      throw new HttpException({ message: "username and password are required" }, HttpStatus.BAD_REQUEST);
    }

    const user = await this.databaseService.findAdminUserByUsername(username);

    if (!user || user.status !== "ACTIVE") {
      throw new HttpException({ message: "Invalid credentials" }, HttpStatus.UNAUTHORIZED);
    }

    const isHashedPassword = BCRYPT_HASH_PATTERN.test(user.password);
    const isPasswordValid = isHashedPassword
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!isPasswordValid) {
      throw new HttpException({ message: "Invalid credentials" }, HttpStatus.UNAUTHORIZED);
    }

    if (!isHashedPassword) {
      const nextHash = await bcrypt.hash(password, getPasswordHashRounds());
      await this.databaseService.updateAdminUserPassword(user.id, nextHash);
    }

    await this.databaseService.touchAdminUserLastLogin(user.id);
    const token = await this.tokenService.createToken(user.id);

    const data: AdminLoginResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };

    return { data };
  }

  @UseGuards(AdminAuthGuard)
  @Post("logout")
  async logout(@Req() request: Request) {
    const token = extractBearerToken(request.header("authorization"));

    if (!token) {
      throw new HttpException({ message: "Unauthorized" }, HttpStatus.UNAUTHORIZED);
    }

    await this.tokenService.revokeToken(token);
    return { data: { success: true } };
  }
}

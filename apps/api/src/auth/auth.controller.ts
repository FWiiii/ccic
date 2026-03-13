import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";
import type { AdminLoginResponse } from "../database/database.types";
import { DatabaseService } from "../database/database.service";
import { TokenService } from "./token.service";

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

    const db = await this.databaseService.readDb();
    const user = db.adminUsers.find(
      (item) => item.username === username && item.password === password && item.status === "ACTIVE"
    );

    if (!user) {
      throw new HttpException({ message: "Invalid credentials" }, HttpStatus.UNAUTHORIZED);
    }

    const token = this.tokenService.createToken(user.id);

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
}

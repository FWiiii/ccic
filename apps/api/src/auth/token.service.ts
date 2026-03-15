import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class TokenService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createToken(userId: string) {
    return this.databaseService.createAdminSession(userId);
  }

  async getUserId(token: string) {
    return this.databaseService.getAdminSessionUserId(token);
  }

  async revokeToken(token: string) {
    await this.databaseService.revokeAdminSession(token);
  }
}

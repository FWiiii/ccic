import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TokenService {
  private readonly tokens = new Map<string, string>();

  createToken(userId: string) {
    const token = `ccic_${randomUUID()}`;
    this.tokens.set(token, userId);
    return token;
  }

  getUserId(token: string) {
    return this.tokens.get(token);
  }

  revokeToken(token: string) {
    this.tokens.delete(token);
  }
}

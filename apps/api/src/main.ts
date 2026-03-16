import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { AppModule } from "./app.module";

loadEnv({ path: join(process.cwd(), ".env"), override: false });
loadEnv({ path: join(process.cwd(), "apps", "api", ".env"), override: false });
loadEnv({ path: join(__dirname, "..", ".env"), override: false });

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:4174",
  "http://127.0.0.1:4174",
];

const readCorsOrigins = () => {
  const raw = String(process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? "").trim();
  if (raw === "*") {
    return true as const;
  }

  const origins = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(process.env.PORT ?? 4000);

  const corsOrigins = readCorsOrigins();
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useStaticAssets(join(process.cwd(), "public"), { prefix: "/static" });

  await app.listen(port);
  console.log(`ccic-api is running on http://localhost:${port}`);
}

void bootstrap();

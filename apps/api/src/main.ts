import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { AppModule } from "./app.module";

loadEnv({ path: join(process.cwd(), ".env"), override: false });
loadEnv({ path: join(process.cwd(), "apps", "api", ".env"), override: false });
loadEnv({ path: join(__dirname, "..", ".env"), override: false });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(process.env.PORT ?? 4000);

  app.enableCors();
  app.useStaticAssets(join(process.cwd(), "public"), { prefix: "/static" });

  await app.listen(port);
  console.log(`ccic-api is running on http://localhost:${port}`);
}

void bootstrap();

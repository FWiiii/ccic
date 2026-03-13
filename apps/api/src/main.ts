import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "node:path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(process.env.PORT ?? 4000);

  app.enableCors();
  app.useStaticAssets(join(process.cwd(), "public"), { prefix: "/static" });

  await app.listen(port);
  console.log(`ccic-api is running on http://localhost:${port}`);
}

void bootstrap();

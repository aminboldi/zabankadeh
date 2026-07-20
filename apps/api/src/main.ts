import "reflect-metadata";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// Next.js loads the root .env automatically, but the Nest process does not.
// Load it explicitly so both applications use the same ports and database.
try {
  loadEnvFile(resolve(__dirname, "../../../.env"));
} catch {
  // Environment variables may be supplied by the hosting environment instead.
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("v1");
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true,
  });
  await app.listen(Number(process.env.PORT ?? 4000));
}

void bootstrap();

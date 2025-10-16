import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { logger } from "./logger";

// Определяем путь, где искать .env
// 1️⃣ При сборке (dist) нужно подняться выше на уровень в src
// 2️⃣ При serve (ts-node / nx serve) — .env уже рядом
const envPathFromDist = path.resolve(__dirname, "../src/.env");
const envPathFromSrc = path.resolve(__dirname, ".env");

// Выбираем тот, который реально существует
const envPath = fs.existsSync(envPathFromSrc) ? envPathFromSrc : envPathFromDist;

// Загружаем .env
if (!fs.existsSync(envPath)) {
  logger.error(`⚠️  .env файл не найден по пути: ${envPath}`);
} else {
  dotenv.config({ path: envPath });
  logger.log(`✅ Загружен .env из: ${envPath}`);
}

export const ENV = process.env;

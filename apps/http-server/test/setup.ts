import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.test before anything else
const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);
config({ path: path.resolve(currentDirname, "../.env.test") });

// Override standard URLs with test URLs
if (process.env.TEST_DATABASE_URL)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
if (process.env.TEST_REDIS_URL)
  process.env.REDIS_URL = process.env.TEST_REDIS_URL;
if (process.env.TEST_MONGO_URL)
  process.env.MONGO_DB_URL = process.env.TEST_MONGO_URL;

// Mock mongoPrisma.$transaction because standalone MongoDB doesn't support transactions
import { mongoPrisma } from "@repo/mongo-db";
(mongoPrisma as any).$transaction = async (callback: any) => {
  return await callback(mongoPrisma);
};

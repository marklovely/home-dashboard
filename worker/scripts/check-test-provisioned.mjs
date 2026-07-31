#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const toml = readFileSync(join(dir, "..", "wrangler.toml"), "utf8");

if (toml.includes("REPLACE_AFTER_PROVISION_TEST")) {
  console.error(
    "Test D1 database_id is not set. Run: npm run provision:test (from worker/)",
  );
  process.exit(1);
}

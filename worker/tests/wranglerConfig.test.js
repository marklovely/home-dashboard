import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const wranglerToml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "wrangler.toml"),
  "utf8",
);

describe("wrangler.toml environments", () => {
  it("defines isolated test Worker name", () => {
    expect(wranglerToml).toMatch(/\[env\.test\]/);
    expect(wranglerToml).toMatch(/name = "lovely-home-hub-api-test"/);
  });

  it("uses separate test D1 and R2 resource names", () => {
    expect(wranglerToml).toMatch(/lovely-home-appliance-manuals-test/);
    expect(wranglerToml).toMatch(/lovely-home-appliance-guides-test/);
    expect(wranglerToml).toMatch(/lovely-home-guide-media-test/);
  });

  it("keeps production D1 id separate from test placeholder or uuid", () => {
    expect(wranglerToml).toMatch(
      /database_id = "6ba7c54d-8804-47c0-8648-77b1aa25e0e0"/,
    );
    expect(wranglerToml).toMatch(/REPLACE_AFTER_PROVISION_TEST|database_id = "[0-9a-f-]{36}"/);
  });
});

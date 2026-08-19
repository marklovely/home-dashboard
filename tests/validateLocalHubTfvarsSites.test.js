import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validate-local-hub-tfvars-sites', () => {
  it('passes when hub.tfvars includes every terraform site from sites.yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-tfvars-'));
    const tfvarsPath = join(dir, 'hub.tfvars');
    writeFileSync(
      tfvarsPath,
      `sites = {
  production = { hostname = "dashboard.lovely-home.co.uk" }
  test = { hostname = "test.lovely-home.co.uk" }
  sandbox = { hostname = "sandbox.lovely-home.co.uk" }
  demo = { hostname = "demo.lovely-home.co.uk" }
}
`
    );

    const result = spawnSync(process.execPath, [
      join(process.cwd(), 'scripts/validate-local-hub-tfvars-sites.mjs'),
      tfvarsPath
    ], { encoding: 'utf8', env: { ...process.env } });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/OK:/);
  });

  it('fails when a registry site is missing from hub.tfvars', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hub-tfvars-'));
    const tfvarsPath = join(dir, 'hub.tfvars');
    writeFileSync(
      tfvarsPath,
      `sites = {
  production = { hostname = "dashboard.lovely-home.co.uk" }
  test = { hostname = "test.lovely-home.co.uk" }
  sandbox = { hostname = "sandbox.lovely-home.co.uk" }
}
`
    );

    const result = spawnSync(process.execPath, [
      join(process.cwd(), 'scripts/validate-local-hub-tfvars-sites.mjs'),
      tfvarsPath
    ], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/missing site\(s\).*demo/i);
    expect(result.stderr).toMatch(/DESTROY/i);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

describe('terraform R2 remote backend', () => {
  it('sets workspace_key_prefix and skip_s3_checksum to limit R2 Class A ops', () => {
    const initScript = readFileSync(resolve(root, 'scripts/terraform-init-r2.sh'), 'utf8');
    const shared = readFileSync(
      resolve(root, 'scripts/lib/terraform-r2-backend-init-args.sh'),
      'utf8'
    );
    const example = readFileSync(resolve(root, 'terraform/environments/backend.hcl.example'), 'utf8');

    expect(initScript).toContain('terraform-r2-backend-init-args.sh');
    expect(shared).toContain('workspace_key_prefix=workspaces');
    expect(shared).toContain('skip_s3_checksum=true');
    expect(example).toContain('workspace_key_prefix');
    expect(example).toContain('skip_s3_checksum');
  });
});

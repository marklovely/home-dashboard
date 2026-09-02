import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  BANNED_WRANGLER_FLAGS,
  WRANGLER_CLI_INVOCATIONS
} from '../scripts/lib/wrangler-cli-invocations.mjs';

const root = process.cwd();
/** @type {Map<string, string>} */
const helpCache = new Map();

/**
 * @param {string[]} command
 */
function wranglerHelp(command) {
  const key = command.join(' ');
  if (helpCache.has(key)) return helpCache.get(key) ?? '';
  const result = spawnSync('npx', ['wrangler', ...command, '--help'], {
    encoding: 'utf8',
    timeout: 90_000
  });
  const text = `${result.stdout}\n${result.stderr}`;
  expect(result.status, text).toBe(0);
  helpCache.set(key, text);
  return text;
}

describe('wrangler CLI invocations', () => {
  it('does not pass flags Wrangler 4 has already removed', () => {
    for (const invocation of WRANGLER_CLI_INVOCATIONS) {
      const source = readFileSync(join(root, invocation.file), 'utf8');
      const commandBlock = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/#[^\n]*/g, '');
      for (const banned of BANNED_WRANGLER_FLAGS) {
        expect(commandBlock, `${invocation.file} still passes --${banned}`).not.toMatch(
          new RegExp(`--${banned}\\b`)
        );
      }
    }
  });

  it('only passes flags the current wrangler help still accepts', () => {
    for (const invocation of WRANGLER_CLI_INVOCATIONS) {
      const help = wranglerHelp(invocation.command);
      for (const flag of invocation.flags) {
        expect(help, `${invocation.file}: unknown --${flag} on wrangler ${invocation.command.join(' ')}`).toMatch(
          new RegExp(`--${flag}\\b`)
        );
      }
      for (const banned of BANNED_WRANGLER_FLAGS) {
        expect(help, `wrangler ${invocation.command.join(' ')} still documents --${banned}`).not.toMatch(
          new RegExp(`--${banned}\\b`)
        );
      }
    }
  });

  it('keeps D1 execute on the launch path non-interactive', () => {
    const d1Scripts = WRANGLER_CLI_INVOCATIONS.filter((item) => item.command.join(' ') === 'd1 execute');
    expect(d1Scripts.length).toBeGreaterThan(3);
    for (const invocation of d1Scripts) {
      expect(invocation.flags, invocation.file).toContain('yes');
      expect(readFileSync(join(root, invocation.file), 'utf8')).toMatch(/--yes/);
    }
  });
});

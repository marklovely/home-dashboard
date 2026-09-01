/**
 * Wrangler CLIs we shell out to on the launch path. Keep this list in sync with
 * the scripts. CI checks each flag against live `wrangler <cmd> --help` so a
 * removed flag cannot ship the way `--account-id` and `--functions-directory` did.
 *
 * @typedef {{ file: string, command: string[], flags: string[] }} WranglerInvocation
 */

/** Flags Wrangler 4 has already removed from commands we use. */
export const BANNED_WRANGLER_FLAGS = ['account-id', 'functions-directory', 'legacy-assets', 'node-compat'];

/** @type {WranglerInvocation[]} */
export const WRANGLER_CLI_INVOCATIONS = [
  {
    file: 'scripts/deploy-cloudflare-pages-site.sh',
    command: ['pages', 'deploy'],
    flags: ['project-name', 'branch', 'commit-dirty']
  },
  {
    file: 'scripts/deploy-platform-admin.sh',
    command: ['pages', 'deploy'],
    flags: ['project-name', 'branch', 'commit-dirty']
  },
  {
    file: 'scripts/deploy-lovely-home-website.sh',
    command: ['pages', 'deploy'],
    flags: ['project-name', 'branch', 'commit-dirty']
  },
  {
    file: 'scripts/lib/platform-archive-storage.mjs',
    command: ['r2', 'object', 'put'],
    flags: ['file', 'remote']
  },
  {
    file: 'scripts/lib/brand-media.mjs',
    command: ['r2', 'object', 'put'],
    flags: ['file', 'content-type', 'remote']
  },
  {
    file: 'scripts/mark-hub-setup-failed.mjs',
    command: ['d1', 'execute'],
    flags: ['remote', 'yes', 'command']
  },
  {
    file: 'scripts/fetch-site-owner-emails.mjs',
    command: ['d1', 'execute'],
    flags: ['remote', 'yes', 'json', 'command']
  },
  {
    file: 'scripts/apply-platform-billing-migration.mjs',
    command: ['d1', 'execute'],
    flags: ['remote', 'yes', 'json', 'command']
  },
  {
    file: 'scripts/seed-sitter-access-emails.mjs',
    command: ['d1', 'execute'],
    flags: ['remote', 'env', 'yes', 'command']
  },
  {
    file: 'scripts/update-billing-archive-key.mjs',
    command: ['d1', 'execute'],
    flags: ['remote', 'yes', 'command']
  }
];

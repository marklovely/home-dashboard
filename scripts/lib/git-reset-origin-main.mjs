import { execFileSync } from 'node:child_process';

/**
 * Fetch origin/main and hard-reset the current checkout to it.
 * Refuses to run outside GitHub Actions.
 *
 * @param {{ cwd?: string, token?: string, repository?: string }} [options]
 */
export function gitResetToOriginMain(options = {}) {
  if (!process.env.GITHUB_ACTIONS) {
    throw new Error('Refusing to git reset --hard outside GitHub Actions.');
  }

  const cwd = options.cwd ?? process.cwd();
  const token = String(options.token ?? '').trim();
  const repository = String(options.repository ?? process.env.GITHUB_REPOSITORY ?? '').trim();

  if (token && repository) {
    const remote = `https://x-access-token:${token}@github.com/${repository}.git`;
    execFileSync('git', ['fetch', remote, '+refs/heads/main:refs/remotes/origin/main'], {
      cwd,
      stdio: 'inherit'
    });
    execFileSync('git', ['reset', '--hard', 'origin/main'], { cwd, stdio: 'inherit' });
    return;
  }

  execFileSync('git', ['fetch', 'origin', 'main'], { cwd, stdio: 'inherit' });
  execFileSync('git', ['reset', '--hard', 'FETCH_HEAD'], { cwd, stdio: 'inherit' });
}

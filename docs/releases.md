# Releases

Lovely Home versions live in `package.json`, `CHANGELOG.md`, and git tags (`vX.Y.Z`). GitHub Releases are created automatically when a version tag is pushed.

The marketing site footer and the hub (chrome + Settings → About) show the same number.

## Cut a release

1. Keep `CHANGELOG.md` **Unreleased** filled in as you merge work.
2. From `main`, after CI is green:

```bash
npm run release -- 2.3.0
```

That rewrites `package.json`, promotes Unreleased to `## 2.3.0`, and writes `website/version.json`.

3. Commit, tag, and push:

```bash
git add package.json CHANGELOG.md website/version.json
git commit -m "Release 2.3.0"
git tag v2.3.0
git push origin main && git push origin v2.3.0
```

4. The **Release** GitHub Action publishes the GitHub Release notes from the CHANGELOG section.

Or run `node scripts/cut-release.mjs 2.3.0 --publish` to commit, tag, and push in one go (only from a clean `main`).

## Cadence

Aim for a tagged release when a slice of customer-visible work lands (signup, billing, hub UX), not on every PR. Empty Unreleased blocks a cut on purpose.

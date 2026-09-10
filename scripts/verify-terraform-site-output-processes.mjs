#!/usr/bin/env node
/**
 * Guard against recursive terraform-site-output / terraform subprocess leaks.
 *
 * Usage:
 *   node scripts/verify-terraform-site-output-processes.mjs
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = join(root, 'scripts/lib/terraform-site-output.mjs');
const siteIds = [
  'zzzz-nonexistent-site-id',
  'production',
  'smith',
  'kitchen-home',
  'larchmount',
  'e2e-1ndvnzcc'
];

/**
 * @param {string} pattern
 */
function countMatchingProcesses(pattern) {
  return new Promise((resolve, reject) => {
    const child = spawn('ps', ['-axo', 'pid=,command='], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ps exited with code ${code}`));
        return;
      }
      const lines = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => pattern.test(line));
      resolve(lines.length);
    });
  });
}

/**
 * @param {string} siteId
 */
function runTerraformSiteOutput(siteId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, 'site', siteId], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

const beforeTerraformSiteOutput = await countMatchingProcesses(/terraform-site-output\.mjs/);
const beforeTerraform = await countMatchingProcesses(/\bterraform\b/);

const results = await Promise.all(siteIds.map((siteId) => runTerraformSiteOutput(siteId)));

await new Promise((resolve) => setTimeout(resolve, 500));

const afterTerraformSiteOutput = await countMatchingProcesses(/terraform-site-output\.mjs/);
const afterTerraform = await countMatchingProcesses(/\bterraform\b/);

const leakedTerraformSiteOutput = afterTerraformSiteOutput - beforeTerraformSiteOutput;
const leakedTerraform = afterTerraform - beforeTerraform;

console.log(
  JSON.stringify(
    {
      siteRuns: siteIds.length,
      exitCodes: results,
      before: {
        terraformSiteOutput: beforeTerraformSiteOutput,
        terraform: beforeTerraform
      },
      after: {
        terraformSiteOutput: afterTerraformSiteOutput,
        terraform: afterTerraform
      },
      leaked: {
        terraformSiteOutput: leakedTerraformSiteOutput,
        terraform: leakedTerraform
      }
    },
    null,
    2
  )
);

if (leakedTerraformSiteOutput > 0 || leakedTerraform > 2) {
  console.error(
    'Process leak detected: terraform-site-output or terraform processes did not exit cleanly.'
  );
  process.exit(1);
}

console.log('Process cleanup OK — no terraform-site-output subprocess leak.');

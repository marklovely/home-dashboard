/**
 * Write platform/sites.yaml from a sites map (preserves file header comments).
 * @param {Record<string, Record<string, string | boolean>>} sites
 */
export function formatSitesYaml(sites) {
  const lines = [
    '# Hub platform site registry.',
    '# Managed sites are provisioned via terraform/ (see docs/platform-terraform.md).',
    '# Platform admin UI reads this manifest — see docs/platform-admin.md.',
    '',
    'sites:'
  ];

  for (const [siteId, meta] of Object.entries(sites)) {
    lines.push(`  ${siteId}:`);
    lines.push(`    hostname: ${meta.hostname}`);
    lines.push(`    hub_environment: ${meta.hub_environment}`);
    lines.push(`    vanilla: ${meta.vanilla === true ? 'true' : 'false'}`);
    if (meta.terraform === false) {
      lines.push(`    terraform: false`);
    } else {
      lines.push(`    terraform: true`);
    }
    if (meta.attach_hub_api_binding === true) {
      lines.push(`    attach_hub_api_binding: true`);
    } else if (meta.attach_hub_api_binding === false) {
      lines.push(`    attach_hub_api_binding: false`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

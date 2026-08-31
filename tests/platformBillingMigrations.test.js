import { describe, expect, it } from 'vitest';
import {
  inferAppliedMigrationNames,
  mergeAppliedMigrationNames,
  parseMigrationNamesFromWranglerJson,
  parseSiteBillingColumnsFromWranglerJson,
  pendingMigrationFiles,
  siteBillingTableExistsFromWranglerJson,
  sortMigrationFiles
} from '../scripts/lib/platform-billing-migrations.mjs';

describe('platform billing migrations', () => {
  it('sorts migration files lexically', () => {
    expect(sortMigrationFiles(['0003_x.sql', '0001_x.sql', '0002_x.sql'])).toEqual([
      '0001_x.sql',
      '0002_x.sql',
      '0003_x.sql'
    ]);
  });

  it('infers applied migrations from site_billing columns', () => {
    expect(
      inferAppliedMigrationNames({
        hasSiteBillingTable: true,
        columns: new Set(['site_id', 'provision_dispatched_at'])
      })
    ).toEqual(['0001_site_billing.sql', '0002_site_billing_provision.sql']);

    expect(
      inferAppliedMigrationNames({
        hasSiteBillingTable: true,
        columns: new Set([
          'site_id',
          'provision_dispatched_at',
          'deprovision_dispatched_at',
          'registry_dispatched_at',
          'signup_email_sent_at'
        ])
      })
    ).toEqual([
      '0001_site_billing.sql',
      '0002_site_billing_provision.sql',
      '0003_site_billing_deprovision.sql',
      '0004_signup_guards.sql',
      '0005_customer_emails.sql'
    ]);
  });

  it('returns only pending migration files', () => {
    const all = ['0001_site_billing.sql', '0002_site_billing_provision.sql', '0003_site_billing_deprovision.sql'];
    expect(pendingMigrationFiles(all, new Set(['0001_site_billing.sql', '0002_site_billing_provision.sql']))).toEqual([
      '0003_site_billing_deprovision.sql'
    ]);
  });

  it('parses wrangler json helpers', () => {
    expect(
      parseMigrationNamesFromWranglerJson([
        { results: [{ name: '0001_site_billing.sql' }, { name: '0002_site_billing_provision.sql' }] }
      ])
    ).toEqual(['0001_site_billing.sql', '0002_site_billing_provision.sql']);

    expect(
      parseSiteBillingColumnsFromWranglerJson([
        { results: [{ name: 'site_id' }, { name: 'provision_dispatched_at' }] }
      ])
    ).toEqual(new Set(['site_id', 'provision_dispatched_at']));

    expect(
      siteBillingTableExistsFromWranglerJson([{ results: [{ name: 'site_billing' }] }])
    ).toBe(true);
  });

  it('merges recorded and inferred migration names', () => {
    expect(mergeAppliedMigrationNames(new Set(['0001_site_billing.sql']), ['0002_site_billing_provision.sql'])).toEqual(
      new Set(['0001_site_billing.sql', '0002_site_billing_provision.sql'])
    );
  });
});

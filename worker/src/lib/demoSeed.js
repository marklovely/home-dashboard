import demoGuideCatalog from '../../fixtures/demo-guide-catalog.json';
import { resetHubToDefaults } from '../routes/siteSetupRoute.js';
import { restoreSiteBackupPayload, SITE_BACKUP_FORMAT_VERSION } from './siteBackupPayload.js';
import { getSiteProfile, updateSiteProfile } from './siteProfile.js';
import { getLondonDateKey, isDemoHubWorker } from './demoHub.js';

/**
 * @returns {Record<string, unknown>}
 */
export function buildDemoSeedPayload() {
  /** @type {import('../houseGuide/exportCatalog.js').GuideCatalog} */
  const catalog = structuredClone(demoGuideCatalog);

  const petsCategory = catalog.categories?.find((category) => category.id === 'pets');
  if (petsCategory) {
    petsCategory.title = 'Bailey';
    petsCategory.cardSubtitle = 'Walks • meals • bedtime';
  }

  return {
    formatVersion: SITE_BACKUP_FORMAT_VERSION,
    backupScope: 'full',
    exportedAt: new Date(0).toISOString(),
    siteSettings: {
      sitterSecretsDisclosed: true,
      sitterAccessEmails: []
    },
    siteProfile: {
      onboardingComplete: true,
      hubName: 'Lovely Demo Home',
      useCase: 'housesitter',
      primaryContact: {
        name: 'Alex & Sam',
        phone: '+44 7700 900123',
        email: 'hosts@example.com'
      },
      secondaryContact: {
        name: 'Backup contact',
        phone: '+44 7700 900456',
        email: 'backup@example.com'
      },
      petCare: {
        hasPets: true,
        name: 'Bailey',
        species: 'Jack Russell',
        age: '5 years',
        temperament: 'Friendly and full of energy',
        feeding: 'Morning and evening — food is in the kitchen.',
        walks: 'Twice daily; keep on a lead near the road.',
        vet: 'Demo Veterinary Clinic',
        vetPhone: '+44 7700 900789',
        vetEmergency: 'Call the vet number first, then the hosts.'
      },
      propertyAddress: {
        line1: '1 Demo Cottage',
        line2: 'Sample Lane',
        city: 'Demo Town',
        county: 'Demo County',
        country: 'United Kingdom',
        postcode: 'DM0 1DE'
      },
      binSchedule: {
        collectionLocation: 'Front of property',
        councilUrl: 'https://example.com/bins',
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
        normalCollectionDay: 'Friday',
        household: [
          { date: '2026-08-29', type: 'rubbish', bankHolidayChange: false },
          { date: '2026-09-05', type: 'recycling', bankHolidayChange: false },
          { date: '2026-09-12', type: 'rubbish', bankHolidayChange: false }
        ],
        gardenWaste: [{ date: '2026-09-02' }, { date: '2026-09-16' }],
        alertHoursBefore: 24
      },
      cameras: {
        enabled: false,
        gatewayUrl: '',
        streams: []
      },
      tabletPreferences: {
        theme: 'dark',
        clockFormat: '24',
        homeScreenScale: '1',
        screensaver: 'on',
        screensaverTimeoutMinutes: 15,
        dismissedBinCollectionDate: null
      }
    },
    hubSecrets: {
      owner_pin: '1234',
      wifi_ssid: 'LovelyDemo-Guest',
      wifi_password: 'demo-wifi-pass',
      primary_phone: '+44 7700 900123',
      primary_email: 'hosts@example.com',
      secondary_phone: '+44 7700 900456',
      secondary_email: 'backup@example.com',
      home_address: '1 Demo Cottage, Sample Lane, Demo Town DM0 1DE',
      lockbox_code: '2468'
    },
    guide: {
      seeded: true,
      catalog,
      uploadedMedia: []
    }
  };
}

/**
 * @param {Record<string, unknown>} env
 */
export async function reseedDemoHub(env) {
  if (!isDemoHubWorker(env)) {
    throw new Error('reseedDemoHub is only available on the demo hub worker');
  }
  await resetHubToDefaults(env);
  const payload = buildDemoSeedPayload();
  await restoreSiteBackupPayload(env, payload);
  await updateSiteProfile(env, {
    ...(payload.siteProfile ?? {}),
    demoLastReseedDate: getLondonDateKey()
  });
}

/**
 * @param {Record<string, unknown>} env
 */
export async function reseedDemoHubIfNeeded(env) {
  const profile = await getSiteProfile(env);
  const today = getLondonDateKey();
  if (profile.demoLastReseedDate === today) return false;
  await reseedDemoHub(env);
  return true;
}

/**
 * @param {Record<string, unknown>} env
 */
export async function ensureDemoHubSeeded(env) {
  if (!isDemoHubWorker(env)) return;
  const profile = await getSiteProfile(env);
  if (!profile.demoLastReseedDate) {
    await reseedDemoHub(env);
  }
}

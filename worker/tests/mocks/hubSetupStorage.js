/**
 * @returns {D1Database}
 */
export function createInMemoryHubSetupDb() {
  /** @type {Record<string, string>} */
  const secrets = {};
  /** @type {Record<string, string>} */
  const settings = {};
  /** @type {string | null} */
  let profilePayload = null;
  /** @type {boolean} */
  let guideSeeded = false;

  return /** @type {D1Database} */ ({
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      const statement = {
        bind(...args) {
          return {
            async first() {
              if (normalized.startsWith('SELECT value FROM house_settings')) {
                const key = String(args[0]);
                return settings[key] ? { value: settings[key] } : null;
              }
              if (normalized.startsWith('SELECT payload FROM site_profile')) {
                return profilePayload ? { payload: profilePayload } : null;
              }
              if (normalized.startsWith('SELECT id FROM site_profile')) {
                return profilePayload ? { id: 'default' } : null;
              }
              if (normalized.startsWith('SELECT id FROM guide_settings')) {
                return guideSeeded ? { id: 'default' } : null;
              }
              return null;
            },
            async all() {
              if (normalized.startsWith('SELECT key, value FROM hub_secrets')) {
                return {
                  results: Object.entries(secrets).map(([key, value]) => ({ key, value }))
                };
              }
              return { results: [] };
            },
            async run() {
              if (normalized.includes('INSERT INTO hub_secrets')) {
                secrets[String(args[0])] = String(args[1]);
              }
              if (normalized.startsWith('DELETE FROM hub_secrets WHERE key')) {
                delete secrets[String(args[0])];
              }
              if (normalized === 'DELETE FROM hub_secrets') {
                for (const key of Object.keys(secrets)) delete secrets[key];
              }
              if (normalized.includes('INSERT INTO house_settings')) {
                settings[String(args[0])] = String(args[1]);
              }
              if (normalized === 'DELETE FROM house_settings') {
                for (const key of Object.keys(settings)) delete settings[key];
              }
              if (normalized.includes('INSERT INTO site_profile')) {
                profilePayload = String(args[1]);
              }
              if (
                normalized.startsWith('DELETE FROM guide_topics') ||
                normalized.startsWith('DELETE FROM guide_categories') ||
                normalized.startsWith('DELETE FROM guide_media') ||
                normalized.startsWith('DELETE FROM guide_settings')
              ) {
                guideSeeded = false;
              }
            }
          };
        },
        async all() {
          return statement.bind().all();
        },
        batch(statements) {
          return Promise.all(
            statements.map((entry) => {
              const bound = entry.bind();
              return bound.run();
            })
          );
        }
      };

      return statement;
    },
    batch(statements) {
      return this.prepare('SELECT 1').batch(statements);
    }
  });
}

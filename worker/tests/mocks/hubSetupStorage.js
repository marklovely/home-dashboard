/**
 * @param {{ guideSeeded?: boolean }} [options]
 * @returns {D1Database}
 */
export function createInMemoryHubSetupDb(options = {}) {
  /** @type {Record<string, string>} */
  const secrets = {};
  /** @type {Record<string, string>} */
  const settings = {};
  /** @type {string | null} */
  let profilePayload = null;
  /** @type {boolean} */
  let guideSeeded = options.guideSeeded === true;
  /** @type {Array<Record<string, unknown>>} */
  let sitterStays = [];

  return /** @type {D1Database} */ ({
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      const statement = {
        bind(...args) {
          return {
            async first() {
              return statementFirst(normalized, args);
            },
            async all() {
              return statementAll(normalized);
            },
            async run() {
              statementRun(normalized, args);
            }
          };
        },
        async first() {
          return statementFirst(normalized, []);
        },
        async all() {
          return statementAll(normalized);
        },
        async run() {
          statementRun(normalized, []);
        }
      };

      /**
       * @param {string} normalized
       * @param {unknown[]} args
       */
      function statementFirst(normalized, args) {
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
      }

      /**
       * @param {string} normalized
       */
      function statementAll(normalized) {
              if (normalized.startsWith('SELECT key, value FROM hub_secrets')) {
                return {
                  results: Object.entries(secrets).map(([key, value]) => ({ key, value }))
                };
              }
              if (normalized.startsWith('SELECT id FROM sitter_stays')) {
                return { results: sitterStays.map((stay) => ({ id: stay.id })) };
              }
              if (normalized.startsWith('SELECT id, label, emails_json')) {
                return { results: sitterStays.map((stay) => ({ ...stay })) };
              }
              return { results: [] };
      }

      /**
       * @param {string} normalized
       * @param {unknown[]} args
       */
      function statementRun(normalized, args) {
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
              if (normalized === 'DELETE FROM sitter_stays') {
                sitterStays = [];
              }
              if (normalized.includes('INSERT INTO sitter_stays')) {
                sitterStays.push({
                  id: String(args[0]),
                  label: args[1],
                  emails_json: String(args[2]),
                  sit_start: String(args[3]),
                  sit_end: String(args[4]),
                  access_opens_at: Number(args[5]),
                  access_closes_at: Number(args[6]),
                  secrets_opens_at: Number(args[7]),
                  secrets_closes_at: Number(args[8]),
                  status: String(args[9]),
                  created_at: Number(args[10]),
                  updated_at: Number(args[11])
                });
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

      return statement;
    },
    batch(statements) {
      return Promise.all(
        statements.map((entry) => {
          if (typeof entry.run === 'function') {
            return entry.run();
          }
          const bound = entry.bind();
          return bound.run();
        })
      );
    }
  });
}

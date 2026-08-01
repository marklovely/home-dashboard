/**
 * @param {Record<string, string>} [initial]
 * @returns {D1Database}
 */
export function createInMemoryHouseSettingsDb(initial = {}) {
  /** @type {Record<string, string>} */
  const settings = { ...initial };

  return /** @type {D1Database} */ ({
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      const statement = {
        bind(...args) {
          return {
            async first() {
              if (normalized.startsWith('SELECT value FROM house_settings')) {
                const key = String(args[0]);
                const value = settings[key];
                return value === undefined ? null : { value };
              }
              if (normalized.startsWith('SELECT key, value FROM hub_secrets')) {
                return null;
              }
              return null;
            },
            async all() {
              if (normalized.startsWith('SELECT key, value FROM hub_secrets')) {
                return { results: [] };
              }
              return { results: [] };
            },
            async run() {
              if (normalized.includes('INSERT INTO house_settings')) {
                settings[String(args[0])] = String(args[1]);
              }
            }
          };
        },
        async all() {
          return statement.bind().all();
        }
      };

      return statement;
    }
  });
}

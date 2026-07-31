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

      return {
        bind(...args) {
          return {
            async first() {
              if (normalized.startsWith('SELECT value FROM house_settings')) {
                const key = String(args[0]);
                const value = settings[key];
                return value === undefined ? null : { value };
              }
              return null;
            },
            async run() {
              if (normalized.includes('INSERT INTO house_settings')) {
                settings[String(args[0])] = String(args[1]);
              }
            }
          };
        }
      };
    }
  });
}

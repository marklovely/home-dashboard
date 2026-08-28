/**
 * In-memory D1 for house_settings and sitter_stays (Worker tests).
 *
 * @param {Record<string, string>} [initialSettings]
 * @param {Array<Record<string, unknown>>} [initialStays]
 * @returns {D1Database}
 */
export function createInMemoryHouseSettingsDb(initialSettings = {}, initialStays = []) {
  /** @type {Record<string, string>} */
  const settings = { ...initialSettings };
  /** @type {Array<Record<string, unknown>>} */
  const stays = initialStays.map((stay) => ({ ...stay }));

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
              if (normalized.startsWith('SELECT id, label, emails_json') && normalized.includes('WHERE id =')) {
                const id = String(args[0]);
                const row = stays.find((stay) => stay.id === id);
                return row ? { ...row } : null;
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
              if (normalized.startsWith('SELECT id, label, emails_json')) {
                const sorted = [...stays].sort((a, b) => {
                  const openDiff = Number(a.access_opens_at) - Number(b.access_opens_at);
                  if (openDiff !== 0) return openDiff;
                  return Number(a.created_at) - Number(b.created_at);
                });
                return { results: sorted.map((row) => ({ ...row })) };
              }
              return { results: [] };
            },
            async run() {
              if (normalized.includes('INSERT INTO house_settings')) {
                settings[String(args[0])] = String(args[1]);
                return;
              }
              if (normalized.includes('DELETE FROM house_settings')) {
                for (const key of Object.keys(settings)) delete settings[key];
                return;
              }
              if (normalized.includes('INSERT INTO sitter_stays')) {
                stays.push({
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
                return;
              }
              if (normalized.startsWith('UPDATE sitter_stays SET status = \'completed\'')) {
                const nowSec = Number(args[0]);
                const id = String(args[1]);
                const row = stays.find((stay) => stay.id === id);
                if (row && row.status !== 'cancelled') {
                  row.status = 'completed';
                  row.updated_at = nowSec;
                }
                return;
              }
              if (normalized.startsWith('UPDATE sitter_stays SET status = \'cancelled\'')) {
                const nowSec = Number(args[0]);
                const id = String(args[1]);
                const row = stays.find((stay) => stay.id === id);
                if (row) {
                  row.status = 'cancelled';
                  row.updated_at = nowSec;
                }
                return;
              }
              if (normalized.startsWith('UPDATE sitter_stays SET access_closes_at')) {
                const nowSec = Number(args[0]);
                const id = String(args[3]);
                const row = stays.find((stay) => stay.id === id);
                if (row) {
                  row.access_closes_at = nowSec;
                  row.secrets_closes_at = nowSec;
                  row.status = 'completed';
                  row.updated_at = nowSec;
                }
                return;
              }
              if (normalized.startsWith('UPDATE sitter_stays SET label')) {
                const [
                  label,
                  emailsJson,
                  sitStart,
                  sitEnd,
                  accessOpensAt,
                  accessClosesAt,
                  secretsOpensAt,
                  secretsClosesAt,
                  updatedAt,
                  id
                ] = args;
                const row = stays.find((stay) => stay.id === String(id));
                if (row) {
                  row.label = label;
                  row.emails_json = String(emailsJson);
                  row.sit_start = String(sitStart);
                  row.sit_end = String(sitEnd);
                  row.access_opens_at = Number(accessOpensAt);
                  row.access_closes_at = Number(accessClosesAt);
                  row.secrets_opens_at = Number(secretsOpensAt);
                  row.secrets_closes_at = Number(secretsClosesAt);
                  row.status = 'scheduled';
                  row.updated_at = Number(updatedAt);
                }
                return;
              }
              if (normalized.includes('DELETE FROM sitter_stays')) {
                stays.length = 0;
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

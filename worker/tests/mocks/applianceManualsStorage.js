export const MINIMAL_PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
  0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65,
  0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x3e, 0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f,
  0x62, 0x6a, 0x0a, 0x74, 0x72, 0x61, 0x69, 0x6c, 0x65, 0x72, 0x0a, 0x3c, 0x3c, 0x2f, 0x52,
  0x6f, 0x6f, 0x74, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, 0x25, 0x25, 0x45,
  0x4f, 0x46, 0x0a
]);

/**
 * @returns {File}
 */
export function createTestPdfFile(name = 'sample-manual.pdf') {
  return new File([MINIMAL_PDF_BYTES], name, { type: 'application/pdf' });
}

/**
 * @returns {Map<string, { data: ArrayBuffer, httpMetadata?: { contentType?: string } }>}
 */
export function createInMemoryR2Bucket() {
  /** @type {Map<string, { data: ArrayBuffer, httpMetadata?: { contentType?: string } }>} */
  const objects = new Map();

  return {
    objects,
    async put(key, value, options = {}) {
      const buffer =
        value instanceof ArrayBuffer
          ? value
          : value instanceof Uint8Array
            ? value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
            : await new Response(value).arrayBuffer();
      objects.set(key, {
        data: buffer,
        httpMetadata: options.httpMetadata
      });
    },
    async get(key) {
      const hit = objects.get(key);
      if (!hit) return null;
      return {
        body: hit.data,
        httpMetadata: hit.httpMetadata,
        async arrayBuffer() {
          return hit.data;
        }
      };
    },
    async delete(key) {
      objects.delete(key);
    }
  };
}

/**
 * @returns {D1Database}
 */
export function createInMemoryApplianceManualsDb() {
  /** @type {Array<Record<string, unknown>>} */
  let rows = [];

  /**
   * @param {Record<string, unknown>[]} list
   */
  function sortRows(list) {
    return [...list].sort((a, b) => {
      const leftOrder = Number(a.sort_order ?? 0);
      const rightOrder = Number(b.sort_order ?? 0);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(a.title).localeCompare(String(b.title));
    });
  }

  return /** @type {D1Database} */ ({
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      /**
       * @param {unknown[]} args
       */
      function createStatement(args = []) {
        return {
          async all() {
            if (normalized.includes('WHERE published = 1')) {
              return { results: sortRows(rows.filter((row) => row.published === 1)) };
            }
            if (normalized.startsWith('SELECT * FROM appliance_manuals ORDER BY')) {
              return { results: sortRows(rows) };
            }
            return { results: [] };
          },
          async first() {
            if (normalized.includes('WHERE id = ?')) {
              return rows.find((row) => row.id === args[0]) ?? null;
            }
            if (normalized.startsWith('SELECT COALESCE(MAX(sort_order)')) {
              const max = rows.reduce((acc, row) => Math.max(acc, Number(row.sort_order ?? 0)), -1);
              return { max_order: max };
            }
            return null;
          },
          async run() {
            if (normalized.startsWith('INSERT INTO appliance_manuals')) {
              rows.push({
                id: args[0],
                title: args[1],
                appliance_name: args[2],
                manufacturer: args[3],
                model: args[4],
                category: args[5],
                location: args[6],
                description: args[7],
                object_key: args[8],
                original_filename: args[9],
                mime_type: args[10],
                file_size: args[11],
                published: args[12],
                sort_order: args[13],
                created_at: args[14],
                updated_at: args[15]
              });
              return { success: true };
            }
            if (normalized.startsWith('UPDATE appliance_manuals SET')) {
              const id = args[args.length - 1];
              const index = rows.findIndex((row) => row.id === id);
              if (index === -1) return { success: false };
              rows[index] = {
                id,
                title: args[0],
                appliance_name: args[1],
                manufacturer: args[2],
                model: args[3],
                category: args[4],
                location: args[5],
                description: args[6],
                object_key: args[7],
                original_filename: args[8],
                mime_type: args[9],
                file_size: args[10],
                published: args[11],
                sort_order: args[12],
                created_at: rows[index].created_at,
                updated_at: args[13]
              };
              return { success: true };
            }
            if (normalized.startsWith('DELETE FROM appliance_manuals')) {
              rows = rows.filter((row) => row.id !== args[0]);
              return { success: true };
            }
            return { success: true };
          }
        };
      }

      const statement = createStatement();
      return {
        bind(...args) {
          return createStatement(args);
        },
        first: statement.first,
        all: statement.all,
        run: statement.run
      };
    }
  });
}

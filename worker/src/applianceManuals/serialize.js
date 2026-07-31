/**
 * @typedef {Object} ApplianceManualRecord
 * @property {string} id
 * @property {string} title
 * @property {string} appliance_name
 * @property {string | null} manufacturer
 * @property {string | null} model
 * @property {string} category
 * @property {string | null} location
 * @property {string | null} description
 * @property {string} object_key
 * @property {string} original_filename
 * @property {string} mime_type
 * @property {number} file_size
 * @property {number} published
 * @property {number} sort_order
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @param {ApplianceManualRecord} row
 */
export function toPublicManual(row) {
  return {
    id: row.id,
    title: row.title,
    applianceName: row.appliance_name,
    manufacturer: row.manufacturer,
    model: row.model,
    category: row.category,
    location: row.location,
    description: row.description,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    published: row.published === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

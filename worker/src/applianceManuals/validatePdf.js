import { APPLIANCE_MANUAL_PDF_MIME, MAX_APPLIANCE_MANUAL_PDF_BYTES } from './constants.js';

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

/**
 * @param {ArrayBuffer | Uint8Array} bytes
 */
export function hasPdfMagicBytes(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i += 1) {
    if (view[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

/**
 * @param {string | undefined | null} filename
 */
export function hasPdfExtension(filename) {
  return /\.pdf$/i.test(String(filename ?? '').trim());
}

/**
 * @param {File | { name?: string, type?: string, size?: number, arrayBuffer: () => Promise<ArrayBuffer> }} file
 * @returns {Promise<{ ok: true, buffer: ArrayBuffer, mimeType: string, size: number, filename: string } | { ok: false, message: string }>}
 */
export async function validatePdfUpload(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { ok: false, message: 'Please select a PDF file.' };
  }

  const filename = String(file.name ?? '').trim();
  if (!filename) {
    return { ok: false, message: 'Please select a PDF file.' };
  }
  if (!hasPdfExtension(filename)) {
    return { ok: false, message: 'Please select a PDF file.' };
  }

  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: 'Please select a PDF file.' };
  }
  if (size > MAX_APPLIANCE_MANUAL_PDF_BYTES) {
    return { ok: false, message: 'The PDF must be smaller than 15 MB.' };
  }

  const declaredMime = String(file.type ?? '').trim().toLowerCase();
  if (declaredMime && declaredMime !== APPLIANCE_MANUAL_PDF_MIME) {
    return { ok: false, message: 'Please select a PDF file.' };
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength <= 0 || buffer.byteLength > MAX_APPLIANCE_MANUAL_PDF_BYTES) {
    return { ok: false, message: 'The PDF must be smaller than 15 MB.' };
  }
  if (!hasPdfMagicBytes(buffer)) {
    return { ok: false, message: 'The uploaded file is not a valid PDF.' };
  }

  return {
    ok: true,
    buffer,
    mimeType: APPLIANCE_MANUAL_PDF_MIME,
    size: buffer.byteLength,
    filename
  };
}

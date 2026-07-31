import { GUIDE_IMAGE_MAX_BYTES, GUIDE_IMAGE_MIMES } from './constants.js';

/**
 * @param {ArrayBuffer} buffer
 */
function detectImageMime(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * @param {File | null | undefined} file
 */
export function validateGuideImageUpload(file) {
  if (!file || !(file instanceof File)) {
    return { ok: false, message: 'Please select an image file.' };
  }
  if (file.size <= 0) {
    return { ok: false, message: 'The image file is empty.' };
  }
  if (file.size > GUIDE_IMAGE_MAX_BYTES) {
    return { ok: false, message: 'Images must be smaller than 5 MB.' };
  }
  return { ok: true, file };
}

/**
 * @param {ArrayBuffer} buffer
 * @param {string} declaredMime
 */
export function validateGuideImageBuffer(buffer, declaredMime) {
  const detected = detectImageMime(buffer);
  if (!detected || !GUIDE_IMAGE_MIMES.has(detected)) {
    return { ok: false, message: 'Only JPEG, PNG, and WebP images are supported.' };
  }
  if (declaredMime && declaredMime !== detected && !GUIDE_IMAGE_MIMES.has(declaredMime)) {
    return { ok: false, message: 'Unsupported image type.' };
  }
  return { ok: true, mimeType: detected };
}

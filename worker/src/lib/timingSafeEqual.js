/**
 * Constant-time comparison for UTF-8 strings.
 * @param {string} a
 * @param {string} b
 */
export function timingSafeEqualString(a, b) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.byteLength, right.byteLength);
  let mismatch = left.byteLength ^ right.byteLength;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return mismatch === 0;
}

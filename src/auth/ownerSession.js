/** Whether the current owner session was opened via PIN (home deployment only). */
let unlockedByPin = false;

export function markOwnerUnlockedByPin() {
  unlockedByPin = true;
}

export function clearOwnerPinSession() {
  unlockedByPin = false;
}

export function isOwnerPinSessionActive() {
  return unlockedByPin;
}

/**
 * Owner may return to the guest experience after PIN unlock on a home deployment tablet.
 */
export function canReturnToHouseSitterMode() {
  return unlockedByPin;
}

/** @internal */
export function resetOwnerSessionForTests() {
  unlockedByPin = false;
}

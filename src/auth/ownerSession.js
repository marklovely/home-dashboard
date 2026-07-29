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

export function canReturnToHouseSitterMode() {
  return unlockedByPin;
}

/** @internal */
export function resetOwnerSessionForTests() {
  unlockedByPin = false;
}

export { stopOwnerInactivityWatch } from './ownerInactivity.js';

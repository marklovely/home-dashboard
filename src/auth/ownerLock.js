import { setActiveProfileId } from '../services/profileService.js';
import { setUserMode, UserMode } from './userMode.js';
import { clearPersistedUiViewingMode } from './uiViewingModePreference.js';
import {
  clearOwnerPinSession,
  markOwnerUnlockedByPin,
  stopOwnerInactivityWatch
} from './ownerSession.js';
import { clearOwnerAccessToken } from './ownerAccessToken.js';
import { lockOwner } from './deviceSessionStore.js';
import { startOwnerInactivityWatch } from './ownerInactivity.js';
import { refreshMyDayCalendar } from '../services/myDayCalendarService.js';

/** @type {(() => void) | null} */
let navigateHomeHandler = null;

/**
 * @param {() => void} navigateHome
 */
export function registerOwnerLockNavigation(navigateHome) {
  navigateHomeHandler = navigateHome;
}

/**
 * Clears owner access and restores the house sitter experience.
 * @param {() => void} [navigateHome]
 */
export function lockToHouseSitterMode(navigateHome = navigateHomeHandler ?? undefined) {
  stopOwnerInactivityWatch();
  clearOwnerPinSession();
  clearOwnerAccessToken();
  clearPersistedUiViewingMode();
  setUserMode(UserMode.HouseSitter, { skipPersist: true });
  setActiveProfileId('housesitter');
  navigateHome?.();
}

/**
 * @param {() => void} [refreshShell]
 */
export function completeOwnerUnlock(refreshShell) {
  setActiveProfileId('owner');
  setUserMode(UserMode.Owner);
  markOwnerUnlockedByPin();
  startOwnerInactivityWatch(() => {
    void lockOwner(() => {
      refreshShell?.();
    });
  });
  void refreshMyDayCalendar();
  refreshShell?.();
}

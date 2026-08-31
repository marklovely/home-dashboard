/**
 * Fully Kiosk-style displays: custom UA, installed PWA, or a coarse large screen.
 * @param {{ userAgent?: string, matchMedia?: (query: string) => { matches: boolean }, standalone?: boolean }} [env]
 */
export function isWallTabletDisplay(env = typeof navigator === 'undefined' ? {} : navigator) {
  const ua = String(env.userAgent ?? '');
  if (/Fully/i.test(ua)) return true;

  const matchMedia =
    typeof env.matchMedia === 'function'
      ? env.matchMedia.bind(env)
      : typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia.bind(window)
        : null;

  const standaloneFlag = Boolean(/** @type {{ standalone?: boolean }} */ (env).standalone);
  const displayStandalone = Boolean(
    matchMedia?.('(display-mode: standalone)').matches ||
      matchMedia?.('(display-mode: fullscreen)').matches ||
      standaloneFlag
  );
  const coarse = Boolean(matchMedia?.('(pointer: coarse)').matches);
  const wide = Boolean(matchMedia?.('(min-width: 700px)').matches);
  return displayStandalone && (coarse || wide);
}

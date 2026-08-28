import { renderWheelieBinIcon } from '../../components/icons/renderWheelieBinIcon.js';
import { applyBinAccentStyles } from '../../lib/binAppearanceProfile.js';
import { dismissBinAlertForCollection } from '../../services/binAlertDismissalService.js';

/**
 * @param {import('../../services/binCollectionService.js').BinCollectionAlert} alert
 * @param {(appId: string) => void} navigate
 * @param {() => void} [onDismiss]
 */
export function createBinAlertBanner(alert, navigate, onDismiss) {
  const banner = document.createElement('div');
  banner.className = 'bin-alert-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  applyBinAccentStyles(banner, alert.colorHex);

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'bin-alert-banner-main';
  openButton.setAttribute(
    'aria-label',
    [alert.title, alert.detail, alert.putOutLine, alert.locationLine, 'Open Bins app.']
      .filter(Boolean)
      .join(' ')
  );

  const icon = document.createElement('span');
  icon.className = 'bin-alert-banner-icon';
  icon.setAttribute('aria-hidden', 'true');
  applyBinAccentStyles(icon, alert.colorHex);
  icon.append(renderWheelieBinIcon(alert.colorHex, { size: 28, className: 'bin-alert-banner-svg' }));

  const copy = document.createElement('span');
  copy.className = 'bin-alert-banner-copy';

  const title = document.createElement('span');
  title.className = 'bin-alert-banner-title';
  title.textContent = alert.title;

  const detail = document.createElement('span');
  detail.className = 'bin-alert-banner-detail';
  detail.textContent = alert.detail;

  const putOut = document.createElement('span');
  putOut.className = 'bin-alert-banner-meta';
  putOut.textContent = alert.putOutLine;

  const location = document.createElement('span');
  location.className = 'bin-alert-banner-meta';
  location.textContent = alert.locationLine;

  copy.append(title, detail, putOut, location);
  openButton.append(icon, copy);
  openButton.addEventListener('click', () => navigate('bins'));

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'bin-alert-banner-dismiss';
  dismissButton.textContent = 'Bins are out';
  dismissButton.setAttribute(
    'aria-label',
    'Mark bins as put out and hide this reminder until after collection day'
  );
  dismissButton.addEventListener('click', (event) => {
    event.stopPropagation();
    dismissBinAlertForCollection(alert.event.date);
    onDismiss?.();
  });

  banner.append(openButton, dismissButton);
  return banner;
}

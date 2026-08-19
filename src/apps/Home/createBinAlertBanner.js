import { renderIcon } from '../../components/icons/renderIcon.js';

/**
 * @param {import('../../services/binCollectionService.js').BinCollectionAlert} alert
 * @param {(appId: string) => void} navigate
 */
export function createBinAlertBanner(alert, navigate) {
  const banner = document.createElement('button');
  banner.type = 'button';
  banner.className = 'bin-alert-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute(
    'aria-label',
    [alert.title, alert.detail, alert.putOutLine, alert.locationLine, 'Open Bins app.']
      .filter(Boolean)
      .join(' ')
  );

  const icon = document.createElement('span');
  icon.className = 'bin-alert-banner-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.append(renderIcon('trash-2', { size: 28, className: 'bin-alert-banner-svg' }));

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
  banner.append(icon, copy);
  banner.addEventListener('click', () => navigate('bins'));
  return banner;
}

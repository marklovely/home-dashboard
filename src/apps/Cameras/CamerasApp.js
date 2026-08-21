import { defineApp } from '../../components/App/defineApp.js';
import {
  buildGo2RtcPlayerUrl,
  isCamerasConfigured,
  readCamerasFromProfile,
  sortCameraStreams
} from '../../lib/cameraProfile.js';
import { getSiteProfileState } from '../../services/siteProfileService.js';

/**
 * @param {import('../../lib/cameraProfile.js').CameraStreamProfile} stream
 * @param {string} gatewayUrl
 * @param {{ featured?: boolean }} [options]
 */
function createCameraTile(stream, gatewayUrl, options = {}) {
  const tile = document.createElement('article');
  tile.className = `cameras-tile${options.featured ? ' cameras-tile--featured' : ''}`;
  tile.dataset.streamId = stream.id;

  const heading = document.createElement('h2');
  heading.className = 'cameras-tile-title';
  heading.textContent = stream.label;

  const frameWrap = document.createElement('div');
  frameWrap.className = 'cameras-tile-frame';

  const playerUrl = buildGo2RtcPlayerUrl(gatewayUrl, stream.src);
  if (!playerUrl) {
    const error = document.createElement('p');
    error.className = 'cameras-tile-status subtle';
    error.textContent = 'Invalid stream configuration.';
    frameWrap.append(error);
  } else {
    const iframe = document.createElement('iframe');
    iframe.className = 'cameras-tile-player';
    iframe.title = `${stream.label} live view`;
    iframe.loading = 'lazy';
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    iframe.referrerPolicy = 'no-referrer';
    iframe.src = playerUrl;
    frameWrap.append(iframe);

    const hint = document.createElement('p');
    hint.className = 'cameras-tile-status subtle';
    hint.textContent =
      'If this stays blank, the camera may be off or the go2rtc gateway unreachable.';
    frameWrap.append(hint);
  }

  tile.append(heading, frameWrap);
  return tile;
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountCamerasApp(viewport, _context) {
  viewport.replaceChildren();

  const page = document.createElement('section');
  page.className = 'app-page cameras-app';

  const profile = getSiteProfileState()?.profile ?? {};
  const cameras = readCamerasFromProfile(profile);

  const intro = document.createElement('p');
  intro.className = 'cameras-intro subtle';
  intro.textContent =
    'Live view from your LAN stream gateway. Internal cameras may be off when you are home — doorbell feeds usually stay on.';

  if (!isCamerasConfigured(cameras)) {
    const empty = document.createElement('p');
    empty.className = 'cameras-empty';
    empty.textContent =
      'No cameras configured yet. In Settings → Cameras, add your go2rtc gateway URL and stream names.';
    page.append(intro, empty);
    viewport.append(page);
    return;
  }

  const streams = sortCameraStreams(cameras.streams);
  const grid = document.createElement('div');
  grid.className = 'cameras-grid';
  grid.setAttribute('role', 'list');

  for (const stream of streams) {
    const tile = createCameraTile(stream, cameras.gatewayUrl, {
      featured: stream.primary || streams.length === 1
    });
    tile.setAttribute('role', 'listitem');
    grid.append(tile);
  }

  const note = document.createElement('p');
  note.className = 'cameras-footnote subtle';
  note.textContent =
    'Streams run through go2rtc on your home network. The gateway URL must use HTTPS when this hub is opened over HTTPS.';

  page.append(intro, grid, note);
  viewport.append(page);
}

export const camerasApp = defineApp({
  id: 'cameras',
  title: 'Cameras',
  iconId: 'video',
  description: 'Owner-only live camera view from your LAN stream gateway.',
  accent: '#5b8def',
  capabilities: ['live-view'],
  profiles: ['owner'],
  async summary() {
    const cameras = readCamerasFromProfile(getSiteProfileState()?.profile ?? {});
    if (!isCamerasConfigured(cameras)) {
      return { title: 'Not set up', subtitle: 'Add go2rtc in Settings' };
    }
    const primary =
      cameras.streams.find((stream) => stream.primary) ?? sortCameraStreams(cameras.streams)[0];
    const count = cameras.streams.length;
    return {
      title: primary?.label ?? 'Live view',
      subtitle: count === 1 ? '1 camera' : `${count} cameras`
    };
  },
  mount: mountCamerasApp
});

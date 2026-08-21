import { showToast } from '../../js/modules/toast.js';
import {
  normalizeCamerasProfile,
  readCamerasFromProfile
} from '../../lib/cameraProfile.js';
import { getSiteProfileState, saveSiteProfile } from '../../services/siteProfileService.js';

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {(options?: { soft?: boolean, panelId?: string }) => void} onRefresh
 */
export function createCameraSettingsFields(context, onRefresh) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const help = document.createElement('p');
  help.className = 'settings-help subtle';
  help.textContent =
    'Connect a go2rtc gateway on your home network. Use an HTTPS URL (e.g. https://192.168.x.x:8443) when this hub is opened over HTTPS — see docs/cameras-go2rtc.md. List stream names from go2rtc.yaml.';

  const cameras = readCamerasFromProfile(getSiteProfileState()?.profile ?? {});

  const enabledLabel = document.createElement('label');
  enabledLabel.className = 'settings-checkbox-row';
  const enabledInput = document.createElement('input');
  enabledInput.type = 'checkbox';
  enabledInput.checked = cameras.enabled;
  const enabledText = document.createElement('span');
  enabledText.textContent = 'Show Cameras app on owner home screen';
  enabledLabel.append(enabledInput, enabledText);

  const gatewayLabel = document.createElement('label');
  gatewayLabel.className = 'settings-field';
  gatewayLabel.textContent = 'go2rtc gateway URL';
  const gatewayInput = document.createElement('input');
  gatewayInput.type = 'url';
  gatewayInput.className = 'settings-text-input';
  gatewayInput.placeholder = 'https://192.168.4.138:8443';
  gatewayInput.value = cameras.gatewayUrl;
  gatewayInput.autocomplete = 'off';
  gatewayLabel.append(gatewayInput);

  const streamsHeading = document.createElement('h3');
  streamsHeading.className = 'settings-subheading';
  streamsHeading.textContent = 'Streams';

  const streamsHelp = document.createElement('p');
  streamsHelp.className = 'settings-help subtle';
  streamsHelp.textContent =
    'Each row maps a label to a go2rtc stream name (the key in go2rtc.yaml). Mark one as primary for the home tile.';

  const streamsList = document.createElement('div');
  streamsList.className = 'settings-camera-streams';

  /** @type {Array<{ id: HTMLInputElement, label: HTMLInputElement, src: HTMLInputElement, primary: HTMLInputElement, row: HTMLElement }>} */
  const streamRows = [];

  /**
   * @param {{ id?: string, label?: string, src?: string, primary?: boolean }} [seed]
   */
  function addStreamRow(seed = {}) {
    const row = document.createElement('div');
    row.className = 'settings-camera-stream-row';

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'settings-text-input';
    idInput.placeholder = 'front-door';
    idInput.value = seed.id ?? '';
    idInput.autocomplete = 'off';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'settings-text-input';
    labelInput.placeholder = 'Front door';
    labelInput.value = seed.label ?? '';
    labelInput.autocomplete = 'off';

    const srcInput = document.createElement('input');
    srcInput.type = 'text';
    srcInput.className = 'settings-text-input';
    srcInput.placeholder = 'front_door';
    srcInput.value = seed.src ?? '';
    srcInput.autocomplete = 'off';

    const primaryLabel = document.createElement('label');
    primaryLabel.className = 'settings-checkbox-row settings-checkbox-row--compact';
    const primaryInput = document.createElement('input');
    primaryInput.type = 'checkbox';
    primaryInput.checked = seed.primary === true;
    primaryLabel.append(primaryInput, document.createTextNode('Primary'));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'settings-action-button settings-action-button--secondary settings-action-button--compact';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      row.remove();
      const index = streamRows.findIndex((entry) => entry.row === row);
      if (index >= 0) streamRows.splice(index, 1);
    });

    row.append(
      createFieldWrap('Id', idInput),
      createFieldWrap('Label', labelInput),
      createFieldWrap('go2rtc src', srcInput),
      primaryLabel,
      removeButton
    );
    streamsList.append(row);
    streamRows.push({ id: idInput, label: labelInput, src: srcInput, primary: primaryInput, row });
  }

  for (const stream of cameras.streams) {
    addStreamRow(stream);
  }
  if (streamRows.length === 0) {
    addStreamRow();
  }

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'settings-action-button settings-action-button--secondary';
  addButton.textContent = 'Add stream';
  addButton.addEventListener('click', () => addStreamRow());

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'settings-action-button';
  saveButton.textContent = 'Save cameras';
  saveButton.addEventListener('click', () => {
    const streams = streamRows
      .map((row) => ({
        id: row.id.value.trim(),
        label: row.label.value.trim(),
        src: row.src.value.trim(),
        primary: row.primary.checked
      }))
      .filter((stream) => stream.id || stream.label || stream.src);

    const next = normalizeCamerasProfile({
      enabled: enabledInput.checked,
      gatewayUrl: gatewayInput.value.trim(),
      streams
    });

    const invalid = next.streams.some((stream) => !stream.id || !stream.label || !stream.src);
    if (next.enabled && (invalid || !next.gatewayUrl || next.streams.length === 0)) {
      showToast(
        context.toast,
        'Enable requires a gateway URL and at least one stream with id, label, and src.'
      );
      return;
    }

    saveButton.disabled = true;
    void saveSiteProfile({ cameras: next })
      .then((result) => {
        if (!result.ok) {
          showToast(context.toast, result.message || 'Could not save cameras.');
          return;
        }
        showToast(context.toast, 'Camera settings saved.');
        onRefresh({ panelId: 'cameras', soft: true });
        context.refreshShell?.();
      })
      .finally(() => {
        saveButton.disabled = false;
      });
  });

  wrap.append(
    help,
    enabledLabel,
    gatewayLabel,
    streamsHeading,
    streamsHelp,
    streamsList,
    addButton,
    saveButton
  );
  return wrap;
}

/**
 * @param {string} label
 * @param {HTMLElement} control
 */
function createFieldWrap(label, control) {
  const wrap = document.createElement('label');
  wrap.className = 'settings-field settings-field--compact';
  wrap.textContent = label;
  wrap.append(control);
  return wrap;
}

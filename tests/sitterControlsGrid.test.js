import { describe, expect, it, afterEach } from 'vitest';
import { CONFIG } from '../src/config.js';
import { mountSitterControlsGrid } from '../src/widgets/Controls/sitterControlsGrid.js';
import {
  applySitterControlsEffective,
  resetSitterControlsForTests
} from '../src/services/sitterControlsService.js';

describe('sitterControlsGrid', () => {
  afterEach(() => {
    resetSitterControlsForTests();
  });

  it('renders every configured Virtual Button when controls are disclosed', () => {
    applySitterControlsEffective(true);

    const host = document.createElement('div');
    host.append(mountSitterControlsGrid({
      config: CONFIG,
      toast: document.createElement('div'),
      lastCommand: document.createElement('span')
    }));

    const buttons = host.querySelectorAll('.routine-button');
    expect(buttons).toHaveLength(CONFIG.buttons.length);

    const groupTitles = [...host.querySelectorAll('.control-button-group__title')].map(
      (el) => el.textContent
    );
    expect(groupTitles).toEqual(CONFIG.buttonGroups.map((group) => group.title));
  });
});

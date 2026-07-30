import { describe, expect, it } from 'vitest';
import { resolveButtonGroups } from '../src/widgets/Alexa/buttonGroups.js';

describe('button groups', () => {
  const config = {
    buttonGroups: [
      { title: 'Lights', buttonIds: [1, 5] },
      { title: 'Heating', buttonIds: [7] }
    ],
    buttons: [
      { id: 1, title: 'On', subtitle: '', icon: '●', colour: '#fff' },
      { id: 5, title: 'Off', subtitle: '', icon: '○', colour: '#000' },
      { id: 7, title: 'Heat', subtitle: '', icon: '♨', colour: '#f00' }
    ]
  };

  it('resolves grouped buttons in order', () => {
    const groups = resolveButtonGroups(config);
    expect(groups).toHaveLength(2);
    expect(groups[0].title).toBe('Lights');
    expect(groups[0].buttons.map((b) => b.id)).toEqual([1, 5]);
    expect(groups[1].buttons.map((b) => b.id)).toEqual([7]);
  });

  it('falls back to a single group when buttonGroups is missing', () => {
    const groups = resolveButtonGroups({ buttons: config.buttons });
    expect(groups).toHaveLength(1);
    expect(groups[0].buttons).toHaveLength(3);
  });
});

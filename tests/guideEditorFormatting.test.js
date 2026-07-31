import { describe, expect, it, vi } from 'vitest';
import { insertAtCursor, wrapSelection } from '../src/apps/HouseGuideEditor/guideEditorFormatting.js';

describe('guideEditorFormatting', () => {
  it('inserts emoji at the cursor', () => {
    const input = document.createElement('input');
    input.value = 'Hello ';
    input.setSelectionRange(6, 6);

    insertAtCursor(input, '🐕');

    expect(input.value).toBe('Hello 🐕');
    expect(input.selectionStart).toBe(8);
  });

  it('wraps the current selection with markdown markers', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Make this bold';
    textarea.setSelectionRange(5, 9);
    const onInput = vi.fn();
    textarea.addEventListener('input', onInput);

    wrapSelection(textarea, '**', '**', 'bold text');

    expect(textarea.value).toBe('Make **this** bold');
    expect(onInput).toHaveBeenCalled();
  });
});

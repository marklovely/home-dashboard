import {
  isEmptyGuideHtml,
  prepareContentForEditor,
  sanitizeGuideHtml
} from '../../widgets/HouseGuide/guideRichText.js';

/** @type {Promise<any> | null} */
let editorModulesPromise = null;

function loadEditorModules() {
  if (!editorModulesPromise) {
    editorModulesPromise = Promise.all([
      import('@tiptap/core'),
      import('@tiptap/starter-kit'),
      import('@tiptap/extension-link'),
      import('emoji-picker-element')
    ]);
  }
  return editorModulesPromise;
}

/**
 * @param {string} label
 * @param {string} value
 * @param {(value: string) => void} onChange
 * @param {{ compact?: boolean }} [options]
 * @returns {HTMLElement & { destroyEditor?: () => void }}
 */
export function createGuideRichTextEditor(label, value, onChange, options = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'guide-editor-field guide-editor-field-rich';

  const heading = document.createElement('span');
  heading.textContent = label;

  const shell = document.createElement('div');
  shell.className = options.compact
    ? 'guide-editor-tiptap-shell guide-editor-tiptap-shell-compact'
    : 'guide-editor-tiptap-shell';

  const loading = document.createElement('p');
  loading.className = 'subtle guide-editor-tiptap-loading';
  loading.textContent = 'Loading editor…';
  shell.append(loading);

  /** @type {import('@tiptap/core').Editor | null} */
  let editor = null;

  wrap.destroyEditor = () => {
    editor?.destroy();
    editor = null;
  };

  void mountEditor({
    shell,
    heading,
    wrap,
    value,
    onChange,
    options,
    setEditor: (instance) => {
      editor = instance;
    }
  });

  if (!options.compact) {
    wrap.append(heading, shell);
  } else {
    wrap.append(shell);
  }

  return wrap;
}

/**
 * @param {object} params
 * @param {HTMLElement} params.shell
 * @param {HTMLElement} params.heading
 * @param {HTMLElement} params.wrap
 * @param {string} params.value
 * @param {(value: string) => void} params.onChange
 * @param {{ compact?: boolean }} params.options
 * @param {(editor: import('@tiptap/core').Editor) => void} params.setEditor
 */
async function mountEditor({ shell, heading, wrap, value, onChange, options, setEditor }) {
  const [{ Editor }, { default: StarterKit }, { default: Link }] = await loadEditorModules();

  shell.replaceChildren();

  const toolbar = document.createElement('div');
  toolbar.className = 'guide-editor-tiptap-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Text formatting');

  const editorHost = document.createElement('div');
  editorHost.className = 'guide-editor-tiptap';

  const hint = document.createElement('p');
  hint.className = 'subtle guide-editor-rich-hint';
  hint.textContent = options.compact
    ? 'Format this step like a word processor.'
    : 'Format like a word processor — bold, lists, links, and emojis.';

  const editor = new Editor({
    element: editorHost,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https'
      })
    ],
    content: prepareContentForEditor(value),
    onUpdate: ({ editor: activeEditor }) => {
      const html = sanitizeGuideHtml(activeEditor.getHTML());
      onChange(isEmptyGuideHtml(html) ? '' : html);
    }
  });

  setEditor(editor);

  toolbar.append(
    createToolbarButton('Bold', 'B', () => editor.chain().focus().toggleBold().run()),
    createToolbarButton('Italic', 'I', () => editor.chain().focus().toggleItalic().run()),
    createToolbarButton('Bullet list', '• List', () => editor.chain().focus().toggleBulletList().run()),
    createToolbarButton('Numbered list', '1. List', () => editor.chain().focus().toggleOrderedList().run()),
    createToolbarButton('Link', 'Link', () => {
      const previous = editor.getAttributes('link').href ?? '';
      const url = window.prompt('Link URL (https://, tel:, or mailto:)', previous || 'https://');
      if (url === null) {
        return;
      }
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }),
    createEmojiPicker(() => editor.chain().focus())
  );

  shell.append(toolbar, editorHost);
  if (!options.compact) {
    wrap.append(hint);
  }
}

/**
 * @param {() => { insertContent: (value: string) => { run: () => boolean } }} getChain
 */
function createEmojiPicker(getChain) {
  const pickerWrap = document.createElement('div');
  pickerWrap.className = 'guide-editor-emoji-picker';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-editor-format-button guide-editor-emoji-toggle';
  toggle.title = 'Insert emoji';
  toggle.setAttribute('aria-label', 'Insert emoji');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '😀';

  const panel = document.createElement('div');
  panel.className = 'guide-editor-emoji-panel-host';
  panel.hidden = true;

  const picker = document.createElement('emoji-picker');
  picker.className = 'guide-editor-emoji-picker-widget';
  picker.addEventListener('emoji-click', (event) => {
    const emoji = event.detail?.unicode;
    if (emoji) {
      getChain().insertContent(emoji).run();
    }
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });

  panel.append(picker);
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  });

  pickerWrap.append(toggle, panel);
  return pickerWrap;
}

/**
 * @param {string} title
 * @param {string} label
 * @param {() => void} onClick
 */
function createToolbarButton(title, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guide-editor-format-button';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

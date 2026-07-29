import { Leaf, Recycle, Trash2, createElement } from 'lucide';

/** @type {Record<string, import('lucide').IconNode>} */
const BIN_ICON_NODES = {
  'trash-2': Trash2,
  recycle: Recycle,
  leaf: Leaf
};

/**
 * @param {string} iconId
 * @param {{ size?: number, className?: string }} [options]
 * @returns {SVGElement}
 */
export function renderBinCollectionIcon(iconId, options = {}) {
  const { size = 28, className = '' } = options;
  const node = BIN_ICON_NODES[iconId] ?? Trash2;
  const svg = createElement(node, {
    width: size,
    height: size,
    'stroke-width': 1.75,
    class: className
  });
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

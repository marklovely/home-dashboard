/**
 * Simple wheelie-bin silhouette filled with the configured bin colour.
 *
 * @param {string} fillHex
 * @param {{ size?: number, className?: string }} [options]
 * @returns {SVGElement}
 */
export function renderWheelieBinIcon(fillHex, options = {}) {
  const { size = 28, className = 'wheelie-bin-icon' } = options;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 32 40');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(Math.round(size * 1.25)));
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');

  const lid = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  lid.setAttribute('x', '7');
  lid.setAttribute('y', '4');
  lid.setAttribute('width', '18');
  lid.setAttribute('height', '5');
  lid.setAttribute('rx', '1.5');
  lid.setAttribute('fill', fillHex);

  const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  handle.setAttribute('x', '14');
  handle.setAttribute('y', '1.5');
  handle.setAttribute('width', '4');
  handle.setAttribute('height', '2.5');
  handle.setAttribute('rx', '1');
  handle.setAttribute('fill', fillHex);

  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute(
    'd',
    'M9 10h14l-1.5 24a2.5 2.5 0 0 1-2.5 2.5h-6.5A2.5 2.5 0 0 1 10.5 34L9 10z'
  );
  body.setAttribute('fill', fillHex);

  const wheelLeft = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  wheelLeft.setAttribute('cx', '12');
  wheelLeft.setAttribute('cy', '35');
  wheelLeft.setAttribute('r', '2.25');
  wheelLeft.setAttribute('fill', 'currentColor');
  wheelLeft.setAttribute('opacity', '0.45');

  const wheelRight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  wheelRight.setAttribute('cx', '20');
  wheelRight.setAttribute('cy', '35');
  wheelRight.setAttribute('r', '2.25');
  wheelRight.setAttribute('fill', 'currentColor');
  wheelRight.setAttribute('opacity', '0.45');

  svg.append(handle, lid, body, wheelLeft, wheelRight);
  return svg;
}

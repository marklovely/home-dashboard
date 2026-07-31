/**
 * Pointer-based drag reordering for lists (works on tablet and desktop).
 *
 * @param {HTMLElement} container
 * @param {(fromIndex: number, toIndex: number) => void} onReorder
 */
export function wirePointerReorder(container, onReorder) {
  /** @type {{ row: HTMLElement, fromIndex: number, pointerId: number } | null} */
  let active = null;

  function rows() {
    return [...container.querySelectorAll('[data-reorder-row]')];
  }

  function indexAt(clientY) {
    const list = rows();
    if (!list.length) return 0;
    for (let i = 0; i < list.length; i++) {
      const rect = list[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return list.length - 1;
  }

  function clearTargets() {
    for (const row of rows()) {
      row.classList.remove('is-drop-target');
    }
  }

  function finishDrag(pointerId, commit) {
    if (!active || active.pointerId !== pointerId) return;
    const fromIndex = active.fromIndex;
    const toIndex = commit ? indexAt(active.lastY ?? 0) : fromIndex;
    active.row.classList.remove('is-dragging');
    clearTargets();
    active = null;
    if (commit && fromIndex !== toIndex) onReorder(fromIndex, toIndex);
  }

  container.addEventListener('pointerdown', (event) => {
    const handle = event.target instanceof Element ? event.target.closest('[data-reorder-handle]') : null;
    if (!handle) return;
    const row = handle.closest('[data-reorder-row]');
    if (!row || !(row instanceof HTMLElement)) return;

    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    const fromIndex = rows().indexOf(row);
    if (fromIndex < 0) return;

    active = { row, fromIndex, pointerId: event.pointerId, lastY: event.clientY };
    row.classList.add('is-dragging');
  });

  container.addEventListener('pointermove', (event) => {
    if (!active || event.pointerId !== active.pointerId) return;
    active.lastY = event.clientY;
    clearTargets();
    const target = indexAt(event.clientY);
    const list = rows();
    if (list[target]) list[target].classList.add('is-drop-target');
  });

  container.addEventListener('pointerup', (event) => {
    finishDrag(event.pointerId, true);
  });

  container.addEventListener('pointercancel', (event) => {
    finishDrag(event.pointerId, false);
  });
}

/**
 * @param {string[]} ids
 * @param {number} fromIndex
 * @param {number} toIndex
 */
export function moveItem(ids, fromIndex, toIndex) {
  const next = [...ids];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

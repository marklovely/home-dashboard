/**
 * Pointer-based drag reordering for lists (works on tablet and desktop).
 *
 * @param {HTMLElement} container
 * @param {(fromIndex: number, toIndex: number) => void} onReorder
 */
export function wirePointerReorder(container, onReorder) {
  /** @type {{ row: HTMLElement, originIndex: number, pointerId: number } | null} */
  let active = null;

  function rows() {
    return [...container.querySelectorAll('[data-reorder-row]')];
  }

  /**
   * @param {number} y
   * @returns {HTMLElement | null}
   */
  function getDragAfterElement(y) {
    const draggableElements = [...container.querySelectorAll('[data-reorder-row]:not(.is-dragging)')];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: /** @type {HTMLElement | null} */ (null) }
    ).element;
  }

  function insertAtIndex(row, index) {
    const siblings = rows().filter((item) => item !== row);
    const before = siblings[index] ?? null;
    if (before) {
      container.insertBefore(row, before);
      return;
    }
    container.appendChild(row);
  }

  function moveRowToPointer(y) {
    if (!active) return;
    const afterElement = getDragAfterElement(y);
    if (afterElement == null) {
      container.appendChild(active.row);
      return;
    }
    container.insertBefore(active.row, afterElement);
  }

  function finishDrag(pointerId, commit) {
    if (!active || active.pointerId !== pointerId) return;
    const { row, originIndex } = active;
    row.classList.remove('is-dragging');
    container.classList.remove('is-reordering');
    const finalIndex = rows().indexOf(row);
    active = null;

    if (!commit) {
      insertAtIndex(row, originIndex);
      return;
    }

    if (originIndex !== finalIndex) {
      onReorder(originIndex, finalIndex);
    }
  }

  container.addEventListener('pointerdown', (event) => {
    const handle = event.target instanceof Element ? event.target.closest('[data-reorder-handle]') : null;
    if (!handle) return;
    const row = handle.closest('[data-reorder-row]');
    if (!row || !(row instanceof HTMLElement)) return;

    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    const originIndex = rows().indexOf(row);
    if (originIndex < 0) return;

    active = { row, originIndex, pointerId: event.pointerId };
    row.classList.add('is-dragging');
    container.classList.add('is-reordering');
  });

  container.addEventListener('pointermove', (event) => {
    if (!active || event.pointerId !== active.pointerId) return;
    moveRowToPointer(event.clientY);
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

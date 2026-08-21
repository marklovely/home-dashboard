/** @typedef {{ row: HTMLElement, originIndex: number, pointerId: number, ghost: HTMLElement, placeholder: HTMLElement, offsetX: number, offsetY: number, scrollRoot: HTMLElement | null, pointerY: number }} ReorderDragState */

const SCROLL_EDGE_PX = 80;
const MAX_SCROLL_STEP_PX = 22;

/**
 * @param {HTMLElement} element
 * @returns {HTMLElement | null}
 */
export function findScrollContainer(element) {
  let node = element.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * @param {HTMLElement | null} scrollRoot
 * @param {number} clientY
 */
function autoScrollDuringDrag(scrollRoot, clientY) {
  if (!scrollRoot) return;
  const rect = scrollRoot.getBoundingClientRect();
  const distanceAbove = clientY - rect.top;
  const distanceBelow = rect.bottom - clientY;

  if (distanceAbove < SCROLL_EDGE_PX) {
    const intensity = (SCROLL_EDGE_PX - distanceAbove) / SCROLL_EDGE_PX;
    scrollRoot.scrollTop -= MAX_SCROLL_STEP_PX * intensity;
    return;
  }

  if (distanceBelow < SCROLL_EDGE_PX) {
    const intensity = (SCROLL_EDGE_PX - distanceBelow) / SCROLL_EDGE_PX;
    scrollRoot.scrollTop += MAX_SCROLL_STEP_PX * intensity;
  }
}

/**
 * Pointer-based drag reordering for lists (works on tablet and desktop).
 * Shows a floating ghost under the pointer and a dashed placeholder at the drop slot.
 *
 * @param {HTMLElement} container
 * @param {(fromIndex: number, toIndex: number) => void} onReorder
 * @param {{ scrollRoot?: HTMLElement | null }} [options]
 */
export function wirePointerReorder(container, onReorder, options = {}) {
  /** @type {ReorderDragState | null} */
  let active = null;
  /** @type {number | null} */
  let scrollFrame = null;

  function rows() {
    return [...container.querySelectorAll('[data-reorder-row]:not(.is-reorder-placeholder)')];
  }

  /**
   * @param {number} y
   * @returns {HTMLElement | null}
   */
  function getDragAfterElement(y) {
    const draggableElements = [...container.querySelectorAll('[data-reorder-row]:not(.is-reorder-placeholder)')];
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

  /**
   * @param {number} clientX
   * @param {number} clientY
   */
  function moveGhost(clientX, clientY) {
    if (!active) return;
    active.ghost.style.setProperty('--reorder-ghost-x', `${clientX - active.offsetX}px`);
    active.ghost.style.setProperty('--reorder-ghost-y', `${clientY - active.offsetY}px`);
  }

  /**
   * @param {number} y
   */
  function movePlaceholderToPointer(y) {
    if (!active) return;
    const afterElement = getDragAfterElement(y);
    if (afterElement == null) {
      container.appendChild(active.placeholder);
      return;
    }
    container.insertBefore(active.placeholder, afterElement);
  }

  function placeholderIndex() {
    if (!active) return -1;
    const ordered = [...container.querySelectorAll('[data-reorder-row]')];
    return ordered.indexOf(active.placeholder);
  }

  function stopAutoScrollLoop() {
    if (scrollFrame != null) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
    }
  }

  function autoScrollLoop() {
    if (!active) {
      stopAutoScrollLoop();
      return;
    }
    autoScrollDuringDrag(active.scrollRoot, active.pointerY);
    movePlaceholderToPointer(active.pointerY);
    scrollFrame = requestAnimationFrame(autoScrollLoop);
  }

  function ensureAutoScrollLoop() {
    if (scrollFrame == null) {
      scrollFrame = requestAnimationFrame(autoScrollLoop);
    }
  }

  function finishDrag(pointerId, commit) {
    if (!active || active.pointerId !== pointerId) return;
    const { row, originIndex, ghost, placeholder } = active;

    stopAutoScrollLoop();
    container.classList.remove('is-reordering');
    document.body.classList.remove('guide-editor-is-reordering');
    row.classList.remove('is-dragging');
    row.hidden = false;

    ghost.remove();
    const dropIndex = placeholderIndex();
    container.insertBefore(row, placeholder);
    placeholder.remove();

    active = null;

    if (!commit) {
      insertAtIndex(row, originIndex);
      return;
    }

    let finalIndex = rows().indexOf(row);
    if (finalIndex < 0) finalIndex = dropIndex;
    if (originIndex !== finalIndex && finalIndex >= 0) {
      onReorder(originIndex, finalIndex);
    }
  }

  /**
   * @param {PointerEvent} event
   */
  function handlePointerMove(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    active.pointerY = event.clientY;
    moveGhost(event.clientX, event.clientY);
    movePlaceholderToPointer(event.clientY);
    ensureAutoScrollLoop();
  }

  container.addEventListener('pointerdown', (event) => {
    const handle = event.target instanceof Element ? event.target.closest('[data-reorder-handle]') : null;
    if (!handle) return;
    const row = handle.closest('[data-reorder-row]');
    if (!row || !(row instanceof HTMLElement) || row.classList.contains('is-reorder-placeholder')) return;

    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    const originIndex = rows().indexOf(row);
    if (originIndex < 0) return;

    const rect = row.getBoundingClientRect();
    const ghost = /** @type {HTMLElement} */ (row.cloneNode(true));
    ghost.classList.add('guide-editor-reorder-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = `${rect.width}px`;
    ghost.style.setProperty('--reorder-ghost-x', `${rect.left}px`);
    ghost.style.setProperty('--reorder-ghost-y', `${rect.top}px`);
    document.body.appendChild(ghost);

    const placeholder = document.createElement('div');
    placeholder.className = 'guide-editor-reorder-placeholder';
    placeholder.dataset.reorderRow = 'true';
    placeholder.style.height = `${rect.height}px`;
    row.parentNode?.insertBefore(placeholder, row);

    row.classList.add('is-dragging');
    row.hidden = true;

    active = {
      row,
      originIndex,
      pointerId: event.pointerId,
      ghost,
      placeholder,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      scrollRoot: options.scrollRoot ?? findScrollContainer(container),
      pointerY: event.clientY
    };

    container.classList.add('is-reordering');
    document.body.classList.add('guide-editor-is-reordering');
    moveGhost(event.clientX, event.clientY);
    movePlaceholderToPointer(event.clientY);
    ensureAutoScrollLoop();
  });

  container.addEventListener('pointermove', handlePointerMove);

  container.addEventListener('pointerup', (event) => {
    finishDrag(event.pointerId, true);
  });

  container.addEventListener('pointercancel', (event) => {
    finishDrag(event.pointerId, false);
  });
}

/**
 * @param {HTMLElement} container
 * @param {string} indexAttribute
 */
export function syncReorderRowIndices(container, indexAttribute = 'blockIndex') {
  let index = 0;
  for (const row of container.querySelectorAll('[data-reorder-row]')) {
    if (row.classList.contains('is-reorder-placeholder')) continue;
    row.dataset[indexAttribute] = String(index);
    index += 1;
  }
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

let timer;

export function showToast(element, message, duration = 1600) {
  if (!element) return;
  clearTimeout(timer);
  element.textContent = message;
  element.classList.add('show');
  timer = setTimeout(() => element.classList.remove('show'), duration);
}

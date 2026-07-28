let timer;

export function showToast(element, message, duration = 1600) {
  clearTimeout(timer);
  element.textContent = message;
  element.classList.add('show');
  timer = setTimeout(() => element.classList.remove('show'), duration);
}

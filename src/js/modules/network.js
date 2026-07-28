export function renderNetworkStatus(elements, online) {
  elements.label.textContent = online ? 'Online' : 'Offline';
  elements.dot.classList.toggle('offline', !online);
}

export function watchNetwork(elements, target = window) {
  const update = () => renderNetworkStatus(elements, navigator.onLine);
  target.addEventListener('online', update);
  target.addEventListener('offline', update);
  update();
  return update;
}

export function formatBattery(level, charging) {
  return {
    level: `${Math.round(level * 100)}%`,
    state: charging ? 'Charging' : 'On battery'
  };
}

export async function initialiseBattery(elements, nav = navigator) {
  if (!nav.getBattery) {
    elements.level.textContent = 'Battery';
    elements.state.textContent = 'Unavailable in this browser';
    return null;
  }
  const battery = await nav.getBattery();
  const render = () => {
    const value = formatBattery(battery.level, battery.charging);
    elements.level.textContent = value.level;
    elements.state.textContent = value.state;
  };
  battery.addEventListener('levelchange', render);
  battery.addEventListener('chargingchange', render);
  render();
  return battery;
}

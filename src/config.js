export const CONFIG = {
  weather: {
    latitude: null,
    longitude: null,
    locationName: 'Home'
  },
  buttonGroups: [
    { title: 'Scenes', buttonIds: [2, 6, 9] },
    { title: 'Downstairs', buttonIds: [1, 5] },
    { title: 'Master bedroom', buttonIds: [8, 10] },
    { title: 'Garage', buttonIds: [3, 4] },
    { title: 'Heating', buttonIds: [7] }
  ],
  buttons: [
    { id: 2, title: 'Bedtime', subtitle: 'Run bedtime scene', icon: '☾', colour: '#7eab90' },
    { id: 6, title: 'Watch Movie', subtitle: 'Set up the lounge', icon: '▶', colour: '#d16dff' },
    { id: 9, title: 'Restore Lights After Movie', subtitle: 'Restore lounge lighting', icon: '◉', colour: '#f4b64f' },
    { id: 1, title: 'Downstairs On', subtitle: 'Turn lights on', icon: '●', colour: '#f4b64f' },
    { id: 5, title: 'Downstairs Off', subtitle: 'Turn lights off', icon: '○', colour: '#6f7b8f' },
    {
      id: 8,
      title: 'Master Bedroom Lights On',
      subtitle: 'Turn master bedroom lights on',
      icon: '●',
      colour: '#c4a8ff'
    },
    {
      id: 10,
      title: 'Master Bedroom Lights Off',
      subtitle: 'Turn master bedroom lights off',
      icon: '○',
      colour: '#9a8ab8'
    },
    { id: 3, title: 'Garage Light On', subtitle: 'Turn garage light on', icon: '▣', colour: '#ff9f43' },
    { id: 4, title: 'Garage Light Off', subtitle: 'Turn garage light off', icon: '□', colour: '#6f7b8f' },
    { id: 7, title: 'Heat to 20°C', subtitle: 'Comfort temperature', icon: '♨', colour: '#ff6b6b' }
  ]
};

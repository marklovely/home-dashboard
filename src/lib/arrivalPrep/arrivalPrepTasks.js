/** @typedef {'home' | 'sitter' | 'before' | 'pet-dog' | 'pet-cat' | 'pet-small' | 'pet-generic' | 'garden'} ArrivalPrepModuleId */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   modules: ArrivalPrepModuleId[],
 *   airbnb?: boolean
 * }} ArrivalPrepTaskDef
 */

/** @type {ArrivalPrepTaskDef[]} */
export const ARRIVAL_PREP_TASKS = [
  // Home — clean & prepare
  { id: 'home.vacuum', label: 'Clean and vacuum floors', modules: ['home'] },
  { id: 'home.dust', label: 'Dust surfaces', modules: ['home'] },
  { id: 'home.tidy', label: 'Tidy communal areas', modules: ['home'] },
  { id: 'home.private-items', label: 'Remove personal or private items', modules: ['home'] },
  { id: 'home.bins', label: 'Empty all bins and put fresh bags in', modules: ['home'] },

  // Home — kitchen
  { id: 'home.kitchen-surfaces', label: 'Clean kitchen surfaces, hob, oven, and microwave', modules: ['home'] },
  { id: 'home.fridge', label: 'Clean fridge, remove expired food, and clear guest fridge space', modules: ['home'] },
  { id: 'home.dishwasher', label: 'Empty dishwasher and clean the filter if needed', modules: ['home'] },
  {
    id: 'home.kitchen-supplies',
    label: 'Check washing-up liquid, dishwasher tablets, and kitchen roll',
    modules: ['home']
  },
  { id: 'home.kitchen-basics', label: 'Check tea, coffee, and sugar basics', modules: ['home'] },

  // Home — bathrooms & bedroom
  { id: 'home.bathrooms', label: 'Clean bathrooms, toilets, sinks, and mirrors', modules: ['home'] },
  {
    id: 'home.bathroom-supplies',
    label: 'Check toilet roll, hand soap, and basic toiletries if you provide them',
    modules: ['home']
  },
  { id: 'home.bed-linen', label: 'Change bed linen (duvet cover, pillows, and pillowcases)', modules: ['home'] },
  { id: 'home.blankets', label: 'Provide spare blankets if needed', modules: ['home'] },
  { id: 'home.storage', label: 'Clear wardrobe, drawer, and hanging space', modules: ['home'] },
  { id: 'home.towels', label: 'Provide bath towels, hand towels, and a bath mat', modules: ['home'] },

  // Sitter — security & property
  { id: 'sitter.doors', label: 'Check doors, windows, locks, and external gates', modules: ['sitter'] },
  { id: 'sitter.alarm', label: 'Test alarm and leave alarm instructions', modules: ['sitter'] },
  { id: 'sitter.cameras', label: 'Explain security cameras if you have them', modules: ['sitter'] },
  { id: 'sitter.keys', label: 'Prepare keys and access; leave spare access instructions', modules: ['sitter'] },
  { id: 'sitter.heating-settings', label: 'Check heating and hot water settings', modules: ['sitter'] },
  { id: 'sitter.utilities', label: 'Know boiler, stopcock, and fuse box locations', modules: ['sitter'] },
  { id: 'sitter.safety-kit', label: 'Check fire extinguisher, blanket, and first aid kit', modules: ['sitter'] },
  { id: 'sitter.appliances', label: 'Leave appliance instructions where helpful', modules: ['sitter'] },

  // Sitter — while away
  { id: 'sitter.post', label: 'Arrange post or parcel handling if needed', modules: ['sitter'] },
  { id: 'sitter.neighbours', label: 'Notify neighbours if appropriate', modules: ['sitter'] },
  { id: 'sitter.contacts', label: 'Leave emergency and tradesperson contacts', modules: ['sitter'] },
  { id: 'sitter.bins', label: 'Confirm bin collection is set up in the hub', modules: ['sitter'] },

  // Before arrival — all guest types
  { id: 'before.heating', label: 'Check heating and hot water is working', modules: ['before'], airbnb: true },
  { id: 'before.wifi', label: 'Check Wi‑Fi', modules: ['before'], airbnb: true },
  { id: 'before.tv', label: 'Check TV and streaming devices', modules: ['before'] },
  { id: 'before.keys', label: 'Prepare keys and access', modules: ['before'], airbnb: true },
  { id: 'before.alarms', label: 'Check smoke and CO alarms', modules: ['before'], airbnb: true },
  { id: 'before.emergency', label: 'Leave emergency information visible', modules: ['before'] },
  { id: 'before.guide', label: 'Put the House Guide somewhere obvious', modules: ['before'], airbnb: true },

  // Pet — dog
  { id: 'pet.food-stock', label: 'Stock enough food for the stay (plus emergency spare)', modules: ['pet-dog', 'pet-cat', 'pet-small', 'pet-generic'] },
  { id: 'pet.treats', label: 'Stock treats and check food is fresh', modules: ['pet-dog', 'pet-cat', 'pet-small', 'pet-generic'] },
  { id: 'pet.feeding-notes', label: 'Label food if needed and leave feeding instructions', modules: ['pet-dog', 'pet-cat', 'pet-small', 'pet-generic'] },
  { id: 'pet.bowls', label: 'Check food and water bowls or fountain', modules: ['pet-dog', 'pet-cat', 'pet-small', 'pet-generic'] },
  { id: 'pet.dog-walk-kit', label: 'Check lead, harness, collar, and ID tag', modules: ['pet-dog'] },
  { id: 'pet.dog-poo-bags', label: 'Stock poo bags', modules: ['pet-dog'] },
  { id: 'pet.dog-outdoor', label: 'Check garden gates, fences, pet flap, and outdoor lighting', modules: ['pet-dog'] },
  { id: 'pet.dog-garden-safe', label: 'Remove anything dangerous from the garden', modules: ['pet-dog'] },
  { id: 'pet.dog-bedding', label: 'Wash pet bedding and prepare sleeping area', modules: ['pet-dog', 'pet-generic'] },
  { id: 'pet.dog-comfort', label: 'Leave favourite toys, grooming brush, and towels', modules: ['pet-dog', 'pet-generic'] },
  { id: 'pet.cat-litter', label: 'Clean litter trays; check litter, scoop, and spare litter', modules: ['pet-cat'] },
  { id: 'pet.cat-carrier', label: 'Check carrier and toys; prepare sleeping area', modules: ['pet-cat'] },
  { id: 'pet.cat-instructions', label: 'Leave litter, indoor/outdoor, and pet-flap instructions', modules: ['pet-cat'] },
  { id: 'pet.cat-safety', label: 'Check windows, doors, cat flap, and secure cleaning chemicals', modules: ['pet-cat'] },
  { id: 'pet.small-supplies', label: 'Check hay, bedding, litter, and cleaning supplies', modules: ['pet-small'] },
  { id: 'pet.small-care', label: 'Leave feeding, cleaning, exercise, and handling instructions', modules: ['pet-small'] },
  { id: 'pet.small-carrier', label: 'Check carrier or travel cage is ready', modules: ['pet-small'] },
  { id: 'pet.health-meds', label: 'Check medication supply and write instructions', modules: ['pet-dog', 'pet-cat', 'pet-small', 'pet-generic'] },
  { id: 'pet.health-vet', label: 'Leave vet and emergency vet details', modules: ['pet-dog', 'pet-cat', 'pet-small', 'pet-generic'] },
  { id: 'pet.health-notes', label: 'Note routines, quirks, fears, and house rules for the pet', modules: ['pet-dog', 'pet-cat', 'pet-generic'] },

  // Garden
  { id: 'garden.mow', label: 'Mow lawn if needed', modules: ['garden'] },
  { id: 'garden.water', label: 'Water plants, baskets, and greenhouse', modules: ['garden'] },
  { id: 'garden.watering-system', label: 'Check automatic watering and outdoor taps', modules: ['garden'] },
  { id: 'garden.secure', label: 'Secure shed and gates; check outdoor lights', modules: ['garden'] },
  { id: 'garden.bins-tools', label: 'Check bins and leave garden tools accessible', modules: ['garden'] }
];

/** @type {Record<ArrivalPrepModuleId, { icon: string, title: string }>} */
export const ARRIVAL_PREP_MODULE_META = {
  home: { icon: '🧹', title: 'Home' },
  sitter: { icon: '🏡', title: 'Property & security' },
  before: { icon: '🔑', title: 'Before they arrive' },
  'pet-dog': { icon: '🐶', title: 'Pet' },
  'pet-cat': { icon: '🐱', title: 'Pet' },
  'pet-small': { icon: '🐰', title: 'Pet' },
  'pet-generic': { icon: '🐾', title: 'Pet' },
  garden: { icon: '🌿', title: 'Garden' }
};

/** @type {ArrivalPrepModuleId[]} */
export const ARRIVAL_PREP_MODULE_ORDER = [
  'home',
  'sitter',
  'pet-dog',
  'pet-cat',
  'pet-small',
  'pet-generic',
  'garden',
  'before'
];

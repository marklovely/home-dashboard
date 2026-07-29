/**
 * @typedef {'rubbish' | 'recycling' | 'gardenWaste'} CollectionTypeId
 */

/**
 * @typedef {Object} HouseholdCollectionEntry
 * @property {string} date ISO YYYY-MM-DD (UK local calendar date)
 * @property {'rubbish' | 'recycling'} type
 * @property {boolean} bankHolidayChange
 */

/**
 * @typedef {Object} GardenWasteCollectionEntry
 * @property {string} date ISO YYYY-MM-DD
 */

/**
 * @typedef {Object} CollectionTypeDefinition
 * @property {CollectionTypeId} id
 * @property {string} displayName
 * @property {string} binDescription Plain bin / container wording (no emoji)
 * @property {string} emoji Colour cue alongside icon and label (not colour-only)
 * @property {string} iconId Lucide icon key for renderBinCollectionIcon
 * @property {string} cssModifier BEM modifier for styling (not sole differentiator)
 */

/** @type {Record<'rubbish' | 'recycling' | 'gardenWaste', CollectionTypeDefinition>} */
export const COLLECTION_TYPES = {
  rubbish: {
    id: 'rubbish',
    displayName: 'Rubbish',
    emoji: '🟢',
    binDescription: 'Green wheelie bin — household rubbish',
    iconId: 'trash-2',
    cssModifier: 'rubbish'
  },
  recycling: {
    id: 'recycling',
    displayName: 'Recycling & glass',
    emoji: '⚫',
    binDescription: 'Black wheelie bin — recycling, plus glass box',
    iconId: 'recycle',
    cssModifier: 'recycling'
  },
  gardenWaste: {
    id: 'gardenWaste',
    displayName: 'Garden waste',
    emoji: '🟫',
    binDescription: 'Brown wheelie bin — garden waste',
    iconId: 'leaf',
    cssModifier: 'garden-waste'
  }
};

/**
 * @param {CollectionTypeDefinition | ReturnType<typeof getCollectionType>} typeDef
 */
export function formatBinLabel(typeDef) {
  return `${typeDef.emoji} ${typeDef.binDescription}`;
}

/** @param {CollectionTypeId | 'rubbish' | 'recycling'} typeId */
export function getCollectionType(typeId) {
  return COLLECTION_TYPES[typeId] ?? COLLECTION_TYPES.rubbish;
}

export const GARDEN_WASTE_ACCEPTED = [
  'Grass cuttings',
  'Hedge cuttings',
  'Weeds',
  'Small branches',
  'Small amounts of leaves',
  'Prunings'
];

export const GARDEN_WASTE_NOT_ACCEPTED = [
  'Soil',
  'Concrete',
  'Rubble',
  'Vegetable peelings',
  'Food scraps',
  'Coal',
  'Ash',
  'Animal waste',
  'Commercial waste',
  'General household waste'
];

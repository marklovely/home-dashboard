import { getStarterGuideCatalog } from './starterGuideTemplates.js';

/** @typedef {{
 *   hasPets?: boolean,
 *   name?: string,
 *   species?: string,
 *   age?: string,
 *   temperament?: string,
 *   feeding?: string,
 *   walks?: string,
 *   vet?: string,
 *   vetPhone?: string,
 *   vetEmergency?: string
 * }} PetCareProfile */

/**
 * @param {string | undefined | null} useCase
 */
export function useCaseIncludesPetSetup(useCase) {
  return useCase === 'housesitter' || useCase === 'both';
}

/**
 * @param {import('../../../types/guideContent.js').GuideCatalog} catalog
 * @param {string} categoryId
 */
function removeCategory(catalog, categoryId) {
  catalog.categories = (catalog.categories ?? []).filter((category) => category.id !== categoryId);
}

/**
 * @param {import('../../../types/guideContent.js').GuideCategory | undefined} category
 * @param {string} topicId
 */
function findTopic(category, topicId) {
  return category?.topics?.find((topic) => topic.id === topicId);
}

/**
 * @param {import('../../../types/guideContent.js').GuideTopic | undefined} topic
 * @param {string} blockType
 */
function findBlock(topic, blockType) {
  return topic?.blocks?.find((block) => block.type === blockType);
}

/**
 * @param {import('../../../types/guideContent.js').GuideCatalog} catalog
 * @param {PetCareProfile | undefined} petCare
 */
function applyPetCareToCatalog(catalog, petCare) {
  const petsCategory = catalog.categories?.find((category) => category.id === 'pets');
  if (!petsCategory || !petCare?.hasPets) return;

  const petName = petCare.name?.trim() || 'Your pet';
  petsCategory.title = petName;
  petsCategory.cardSubtitle = 'Feeding • Walks • Vet';
  petsCategory.searchTerms = [
    ...(petsCategory.searchTerms ?? []),
    petName.toLowerCase(),
    'pet',
    'dog',
    'cat'
  ];

  const atGlance = findTopic(petsCategory, 'pet-at-a-glance') ?? findTopic(petsCategory, 'pet-overview');
  if (atGlance) {
    atGlance.title = `${petName} at a glance`;
    atGlance.subtitle = [petCare.species, petCare.age].filter(Boolean).join(' · ') || atGlance.subtitle;
    atGlance.summary = `Quick facts about ${petName}`;
    const keyValues = findBlock(atGlance, 'keyValues');
    if (keyValues && 'items' in keyValues && Array.isArray(keyValues.items)) {
      keyValues.items = [
        { label: 'Name', value: petName },
        { label: 'Species / breed', value: petCare.species?.trim() || 'Add species or breed' },
        { label: 'Age', value: petCare.age?.trim() || 'Add age' },
        { label: 'Health / medication', value: 'None — or describe in Guide Editor' }
      ];
    }
    const textBlock = atGlance.blocks?.find((block) => block.type === 'text' || block.type === 'tip');
    if (textBlock && 'content' in textBlock) {
      textBlock.content =
        petCare.temperament?.trim() ||
        'Describe personality, favourite spots, and whether they are allowed on furniture or beds.';
    }
  }

  const feeding = findTopic(petsCategory, 'pet-feeding');
  if (feeding && petCare.feeding?.trim()) {
    const stepsBlock = findBlock(feeding, 'steps');
    if (stepsBlock && 'steps' in stepsBlock && Array.isArray(stepsBlock.steps)) {
      stepsBlock.steps = petCare.feeding
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }

  const walks = findTopic(petsCategory, 'pet-walks');
  if (walks && petCare.walks?.trim()) {
    const textBlock = walks.blocks?.find((block) => block.type === 'text');
    if (textBlock && 'content' in textBlock) {
      textBlock.content = petCare.walks.trim();
    }
  }

  const vet = findTopic(petsCategory, 'pet-vet');
  if (vet) {
    const keyValues = findBlock(vet, 'keyValues');
    if (keyValues && 'items' in keyValues && Array.isArray(keyValues.items)) {
      keyValues.items = [
        { label: 'Regular vet', value: petCare.vet?.trim() || 'Add clinic name' },
        { label: 'Phone', value: petCare.vetPhone?.trim() || 'Add phone number' },
        { label: 'Out-of-hours', value: petCare.vetEmergency?.trim() || 'Add emergency vet' }
      ];
    }
  }
}

/**
 * @param {string | undefined | null} useCase
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function buildStarterGuideCatalog(useCase, profile) {
  const catalog = structuredClone(getStarterGuideCatalog(useCase));
  const petCare = /** @type {PetCareProfile | undefined} */ (profile?.petCare);

  if (useCaseIncludesPetSetup(useCase)) {
    if (!petCare?.hasPets) {
      removeCategory(catalog, 'pets');
    } else {
      applyPetCareToCatalog(catalog, petCare);
    }
  } else {
    removeCategory(catalog, 'pets');
  }

  return catalog;
}

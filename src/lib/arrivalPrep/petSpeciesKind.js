/** @typedef {'pet-dog' | 'pet-cat' | 'pet-small' | 'pet-generic'} PetSpeciesModuleId */

const DOG_PATTERN =
  /\b(dog|puppy|labrador|retriever|spaniel|collie|terrier|poodle|dachshund|husky|beagle|corgi|whippet|greyhound|bulldog|shepherd)\b/i;
const CAT_PATTERN = /\b(cat|kitten|feline|tabby|persian|siamese|maine coon|ragdoll|bengal)\b/i;
const SMALL_PATTERN =
  /\b(rabbit|bunny|guinea|hamster|bird|parrot|reptile|snake|lizard|fish|gerbil|chinchilla|ferret|tortoise|gecko)\b/i;

/**
 * @param {string | undefined | null} species
 * @returns {PetSpeciesModuleId}
 */
export function detectPetSpeciesModule(species) {
  const value = String(species ?? '').trim();
  if (!value) return 'pet-generic';
  if (DOG_PATTERN.test(value)) return 'pet-dog';
  if (CAT_PATTERN.test(value)) return 'pet-cat';
  if (SMALL_PATTERN.test(value)) return 'pet-small';
  return 'pet-generic';
}

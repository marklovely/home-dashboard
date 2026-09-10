import {
  ARRIVAL_PREP_MODULE_META,
  ARRIVAL_PREP_TASKS
} from './arrivalPrepTasks.js';
import { normalizeArrivalPrepProfile } from './arrivalPrepProfile.js';
import { detectPetSpeciesModule } from './petSpeciesKind.js';
import { listPets } from '../petCare.js';
import { buildArrivalPrepTaskId } from './arrivalPrepTaskIds.js';

/** @typedef {'owner' | 'housesitter' | 'airbnb' | 'both' | string} HubUseCase */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   checked: boolean,
 *   custom?: boolean
 * }} ArrivalPrepTask
 */

/**
 * @typedef {{
 *   id: string,
 *   icon: string,
 *   title: string,
 *   tasks: ArrivalPrepTask[],
 *   completeCount: number,
 *   totalCount: number
 * }} ArrivalPrepSection
 */

/**
 * @typedef {{
 *   title: string,
 *   sections: ArrivalPrepSection[],
 *   remainingCount: number,
 *   totalCount: number,
 *   completeCount: number,
 *   taskIds: string[]
 * }} ArrivalPrepChecklist
 */


/**
 * @param {HubUseCase} useCase
 */
export function arrivalPrepChecklistTitle(useCase) {
  switch (useCase) {
    case 'airbnb':
      return 'Getting ready for your guest';
    case 'housesitter':
      return 'Getting ready for your sitter';
    case 'both':
      return 'Getting ready for guests';
    default:
      return '';
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {boolean}
 */
export function shouldShowArrivalPrepChecklist(profile) {
  const useCase = String(profile?.useCase ?? 'owner');
  return useCase !== 'owner' && Boolean(arrivalPrepChecklistTitle(useCase));
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {boolean}
 */
export function profileIncludesSitterPrep(profile) {
  const useCase = String(profile?.useCase ?? 'owner');
  return useCase === 'housesitter' || useCase === 'both';
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {string[]}
 */
export function getActiveFixedModules(profile) {
  const useCase = String(profile?.useCase ?? 'owner');
  if (useCase === 'owner') return [];

  /** @type {string[]} */
  const modules = ['home'];
  if (profileIncludesSitterPrep(profile)) {
    modules.push('sitter');
  }
  const arrivalPrep = normalizeArrivalPrepProfile(profile?.arrivalPrep);
  if (arrivalPrep.gardenEnabled) {
    modules.push('garden');
  }
  modules.push('before');
  return modules;
}

/** @deprecated Use getActiveFixedModules — kept for existing tests. */
export const getActiveArrivalPrepModules = getActiveFixedModules;

/**
 * @param {import('./arrivalPrepTasks.js').ArrivalPrepModuleId} moduleId
 * @param {string} petName
 */
function petSectionMeta(moduleId, petName) {
  const meta = ARRIVAL_PREP_MODULE_META[moduleId];
  return {
    icon: meta?.icon ?? '🐾',
    title: petName.trim() || 'Your pet'
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {ArrivalPrepChecklist | null}
 */
export function buildArrivalPrepChecklist(profile) {
  const useCase = String(profile?.useCase ?? 'owner');
  const title = arrivalPrepChecklistTitle(useCase);
  if (!title) return null;

  const activeFixed = new Set(getActiveFixedModules(profile));
  const pets = listPets(profile?.petCare);
  const arrivalPrep = normalizeArrivalPrepProfile(profile?.arrivalPrep);
  const checkedSet = new Set(arrivalPrep.checkedTaskIds);
  const isAirbnb = useCase === 'airbnb';

  /** @type {Map<string, ArrivalPrepTask[]>} */
  const tasksBySection = new Map();

  /** @param {string} sectionId @param {ArrivalPrepTask} task */
  function addTask(sectionId, task) {
    const list = tasksBySection.get(sectionId) ?? [];
    list.push(task);
    tasksBySection.set(sectionId, list);
  }

  for (const task of ARRIVAL_PREP_TASKS) {
    const moduleId = task.modules.find((entry) => activeFixed.has(entry));
    if (moduleId) {
      if (moduleId === 'before' && isAirbnb && task.airbnb !== true) continue;
      addTask(moduleId, {
        id: task.id,
        label: task.label,
        checked: checkedSet.has(task.id)
      });
      continue;
    }

    for (const pet of pets) {
      const petModule = detectPetSpeciesModule(pet.species);
      if (!task.modules.includes(petModule)) continue;
      const sectionId = `pet-${pet.id}`;
      addTask(sectionId, {
        id: buildArrivalPrepTaskId(task.id, pet.id),
        label: task.label,
        checked: checkedSet.has(buildArrivalPrepTaskId(task.id, pet.id))
      });
    }
  }

  for (const custom of arrivalPrep.customTasks) {
    addTask(custom.sectionId, {
      id: custom.id,
      label: custom.label,
      checked: checkedSet.has(custom.id),
      custom: true
    });
  }

  /** @type {ArrivalPrepSection[]} */
  const sections = [];
  /** @type {string[]} */
  const taskIds = [];

  /** @param {string} sectionId @param {string} icon @param {string} sectionTitle */
  function pushSection(sectionId, icon, sectionTitle) {
    const tasks = tasksBySection.get(sectionId);
    if (!tasks?.length) return;
    const completeCount = tasks.filter((task) => task.checked).length;
    taskIds.push(...tasks.map((task) => task.id));
    sections.push({
      id: sectionId,
      icon,
      title: sectionTitle,
      tasks,
      completeCount,
      totalCount: tasks.length
    });
  }

  if (activeFixed.has('home')) {
    const meta = ARRIVAL_PREP_MODULE_META.home;
    pushSection('home', meta.icon, meta.title);
  }
  if (activeFixed.has('sitter')) {
    const meta = ARRIVAL_PREP_MODULE_META.sitter;
    pushSection('sitter', meta.icon, meta.title);
  }
  for (const pet of pets) {
    const moduleId = detectPetSpeciesModule(pet.species);
    const { icon, title: sectionTitle } = petSectionMeta(moduleId, pet.name);
    pushSection(`pet-${pet.id}`, icon, sectionTitle);
  }
  if (activeFixed.has('garden')) {
    const meta = ARRIVAL_PREP_MODULE_META.garden;
    pushSection('garden', meta.icon, meta.title);
  }
  if (activeFixed.has('before')) {
    const meta = ARRIVAL_PREP_MODULE_META.before;
    pushSection('before', meta.icon, meta.title);
  }

  const totalCount = taskIds.length;
  const completeCount = sections.reduce((sum, section) => sum + section.completeCount, 0);

  return {
    title,
    sections,
    remainingCount: totalCount - completeCount,
    totalCount,
    completeCount,
    taskIds
  };
}

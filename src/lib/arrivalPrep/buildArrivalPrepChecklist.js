import {
  ARRIVAL_PREP_MODULE_META,
  ARRIVAL_PREP_MODULE_ORDER,
  ARRIVAL_PREP_TASKS
} from './arrivalPrepTasks.js';
import { normalizeArrivalPrepProfile } from './arrivalPrepProfile.js';
import { detectPetSpeciesModule } from './petSpeciesKind.js';

/** @typedef {'owner' | 'housesitter' | 'airbnb' | 'both' | string} HubUseCase */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   checked: boolean
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
 * @returns {import('./arrivalPrepTasks.js').ArrivalPrepModuleId[]}
 */
export function getActiveArrivalPrepModules(profile) {
  const useCase = String(profile?.useCase ?? 'owner');
  if (useCase === 'owner') return [];

  /** @type {import('./arrivalPrepTasks.js').ArrivalPrepModuleId[]} */
  const modules = ['home'];

  if (useCase === 'housesitter' || useCase === 'both') {
    modules.push('sitter');
  }

  const petCare = /** @type {{ hasPets?: boolean, species?: string, name?: string } | undefined} */ (
    profile?.petCare
  );
  if (petCare?.hasPets) {
    modules.push(detectPetSpeciesModule(petCare.species));
  }

  const arrivalPrep = normalizeArrivalPrepProfile(profile?.arrivalPrep);
  if (arrivalPrep.gardenEnabled) {
    modules.push('garden');
  }

  modules.push('before');
  return modules;
}

/**
 * @param {import('./arrivalPrepTasks.js').ArrivalPrepModuleId} moduleId
 * @param {Record<string, unknown> | null | undefined} profile
 */
function sectionTitleForModule(moduleId, profile) {
  if (moduleId.startsWith('pet-')) {
    const petName = String(
      /** @type {{ name?: string } | undefined} */ (profile?.petCare)?.name ?? ''
    ).trim();
    return petName || 'Your pet';
  }
  return ARRIVAL_PREP_MODULE_META[moduleId]?.title ?? moduleId;
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {ArrivalPrepChecklist | null}
 */
export function buildArrivalPrepChecklist(profile) {
  const useCase = String(profile?.useCase ?? 'owner');
  const title = arrivalPrepChecklistTitle(useCase);
  if (!title) return null;

  const activeModules = getActiveArrivalPrepModules(profile);
  const activeSet = new Set(activeModules);
  const checkedSet = new Set(normalizeArrivalPrepProfile(profile?.arrivalPrep).checkedTaskIds);
  const isAirbnb = useCase === 'airbnb';

  /** @type {Map<string, ArrivalPrepTask[]>} */
  const tasksByModule = new Map();

  for (const task of ARRIVAL_PREP_TASKS) {
    const moduleId = task.modules.find((entry) => activeSet.has(entry));
    if (!moduleId) continue;
    if (moduleId === 'before' && isAirbnb && task.airbnb !== true) continue;

    const list = tasksByModule.get(moduleId) ?? [];
    list.push({
      id: task.id,
      label: task.label,
      checked: checkedSet.has(task.id)
    });
    tasksByModule.set(moduleId, list);
  }

  /** @type {ArrivalPrepSection[]} */
  const sections = [];
  /** @type {string[]} */
  const taskIds = [];

  for (const moduleId of ARRIVAL_PREP_MODULE_ORDER) {
    const tasks = tasksByModule.get(moduleId);
    if (!tasks?.length) continue;
    const meta = ARRIVAL_PREP_MODULE_META[moduleId];
    const completeCount = tasks.filter((task) => task.checked).length;
    taskIds.push(...tasks.map((task) => task.id));
    sections.push({
      id: moduleId,
      icon: meta?.icon ?? '•',
      title: sectionTitleForModule(moduleId, profile),
      tasks,
      completeCount,
      totalCount: tasks.length
    });
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

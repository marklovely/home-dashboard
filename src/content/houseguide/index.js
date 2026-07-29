import { getGuideHomeSummary, listGuideTopics } from '../../services/guideService.js';

export { getGuideHomeSummary, listGuideTopics };

/** @deprecated Use guideService instead */
export function loadHouseGuideCatalog() {
  return { topics: listGuideTopics() };
}

export const DEFAULT_LOCAL_PROFILE = {
  onboardingComplete: false,
  hubName: '',
  useCase: 'owner',
  primaryContact: { name: '', phone: '', email: '' },
  secondaryContact: { name: '', phone: '', email: '' },
  petCare: {
    hasPets: false,
    name: '',
    species: '',
    age: '',
    temperament: '',
    feeding: '',
    walks: '',
    vet: '',
    vetPhone: '',
    vetEmergency: ''
  },
  propertyAddress: {
    line1: '',
    line2: '',
    line3: '',
    city: '',
    county: '',
    country: '',
    postcode: '',
    uprn: ''
  },
  arrivalPrep: {
    gardenEnabled: false,
    checkedTaskIds: []
  }
};

const PROFILE_KEY = 'lovely-home-hub-site-profile';
const SECRETS_KEY = 'lovely-home-hub-site-secrets';

/**
 * @returns {Record<string, unknown> & { _hasLocalRow: boolean }}
 */
export function loadLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return { ...DEFAULT_LOCAL_PROFILE, _hasLocalRow: false };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LOCAL_PROFILE,
      ...parsed,
      primaryContact: { ...DEFAULT_LOCAL_PROFILE.primaryContact, ...parsed?.primaryContact },
      secondaryContact: { ...DEFAULT_LOCAL_PROFILE.secondaryContact, ...parsed?.secondaryContact },
      petCare: { ...DEFAULT_LOCAL_PROFILE.petCare, ...parsed?.petCare },
      propertyAddress: { ...DEFAULT_LOCAL_PROFILE.propertyAddress, ...parsed?.propertyAddress },
      arrivalPrep: {
        ...DEFAULT_LOCAL_PROFILE.arrivalPrep,
        ...(parsed?.arrivalPrep && typeof parsed.arrivalPrep === 'object' ? parsed.arrivalPrep : {}),
        checkedTaskIds: Array.isArray(parsed?.arrivalPrep?.checkedTaskIds)
          ? parsed.arrivalPrep.checkedTaskIds.map((entry) => String(entry ?? '').trim()).filter(Boolean)
          : DEFAULT_LOCAL_PROFILE.arrivalPrep.checkedTaskIds
      },
      _hasLocalRow: true
    };
  } catch {
    return { ...DEFAULT_LOCAL_PROFILE, _hasLocalRow: false };
  }
}

/**
 * @param {Record<string, unknown>} patch
 */
export function mergeLocalProfile(patch) {
  const current = loadLocalProfile();
  const next = {
    ...current,
    ...patch,
    primaryContact: patch.primaryContact
      ? { ...current.primaryContact, ...patch.primaryContact }
      : current.primaryContact,
    secondaryContact: patch.secondaryContact
      ? { ...current.secondaryContact, ...patch.secondaryContact }
      : current.secondaryContact,
    petCare: patch.petCare ? { ...current.petCare, ...patch.petCare } : current.petCare,
    propertyAddress: patch.propertyAddress
      ? { ...current.propertyAddress, ...patch.propertyAddress }
      : current.propertyAddress,
    arrivalPrep: patch.arrivalPrep
      ? {
          ...current.arrivalPrep,
          ...(patch.arrivalPrep && typeof patch.arrivalPrep === 'object' ? patch.arrivalPrep : {}),
          checkedTaskIds: Array.isArray(patch.arrivalPrep?.checkedTaskIds)
            ? patch.arrivalPrep.checkedTaskIds.map((entry) => String(entry ?? '').trim()).filter(Boolean)
            : current.arrivalPrep.checkedTaskIds
        }
      : current.arrivalPrep,
    _hasLocalRow: true
  };
  const { _hasLocalRow: hasLocalRow, ...stored } = next;
  void hasLocalRow;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(stored));
  return next;
}

/**
 * @returns {Record<string, string>}
 */
export function loadLocalSecrets() {
  try {
    const raw = localStorage.getItem(SECRETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, string>} patch
 */
export function mergeLocalSecrets(patch) {
  const next = { ...loadLocalSecrets(), ...patch };
  for (const [key, value] of Object.entries(patch)) {
    if (!String(value ?? '').trim()) {
      delete next[key];
    }
  }
  localStorage.setItem(SECRETS_KEY, JSON.stringify(next));
  return next;
}

export function clearLocalSetup() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(SECRETS_KEY);
}

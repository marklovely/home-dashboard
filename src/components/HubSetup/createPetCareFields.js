import { HUB_SETUP_FIELD_HELP } from './hubSetupHelpContent.js';
import { createSetupField, createSetupIntro, createSetupSelect, createSetupTextarea } from './hubSetupFields.js';
import { emptyPetProfile, normalizePetCare } from '../../lib/petCare.js';

/**
 * @typedef {import('../../lib/petCare.js').PetProfile} PetProfile
 * @typedef {import('../../lib/petCare.js').PetCareProfile} PetCareProfile
 */

/**
 * @param {PetProfile} pet
 * @param {number} index
 * @param {() => void} onChange
 */
function createPetCard(pet, index, onChange) {
  const card = document.createElement('fieldset');
  card.className = 'hub-setup-pet-card';
  card.dataset.petId = pet.id;

  const legend = document.createElement('legend');
  legend.className = 'hub-setup-pet-card-legend';
  legend.textContent = index === 0 ? 'Pet details' : `Pet ${index + 1}`;

  const name = createSetupField('Pet name', pet.name, {
    placeholder: 'e.g. Bailey',
    ...HUB_SETUP_FIELD_HELP.petName
  });
  const species = createSetupField('Species / breed', pet.species, {
    placeholder: 'e.g. Labrador'
  });
  const age = createSetupField('Age', pet.age, { placeholder: 'e.g. 5 years' });
  const temperament = createSetupTextarea('Personality & rules', pet.temperament, {
    placeholder: 'Friendly with people, allowed on sofa, nervous around bikes…',
    rows: 3
  });
  const feeding = createSetupTextarea('Feeding routine', pet.feeding, {
    placeholder: 'One line per meal or step, e.g.\nMorning: 1 scoop dry food\nEvening: 1/4 tin wet food',
    rows: 4
  });
  const walks = createSetupTextarea('Walks & exercise', pet.walks, {
    placeholder: 'How often, where the lead is, favourite routes…',
    rows: 3
  });
  const vet = createSetupField('Regular vet', pet.vet, { placeholder: 'Clinic name' });
  const vetPhone = createSetupField('Vet phone', pet.vetPhone, { type: 'tel' });
  const vetEmergency = createSetupField('Emergency vet (optional)', pet.vetEmergency, {
    type: 'tel'
  });

  for (const field of [name, species, age, temperament, feeding, walks, vet, vetPhone, vetEmergency]) {
    const control = field.input ?? field.textarea;
    control.addEventListener('input', onChange);
  }

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'settings-action-button settings-action-button--secondary hub-setup-pet-remove';
  removeButton.textContent = 'Remove this pet';
  removeButton.hidden = index === 0;
  removeButton.addEventListener('click', () => {
    card.remove();
    onChange();
  });

  card.append(
    legend,
    name.wrap,
    species.wrap,
    age.wrap,
    temperament.wrap,
    feeding.wrap,
    walks.wrap,
    vet.wrap,
    vetPhone.wrap,
    vetEmergency.wrap,
    removeButton
  );

  return {
    card,
    removeButton,
    readPet() {
      return {
        id: pet.id,
        name: name.input.value.trim(),
        species: species.input.value.trim(),
        age: age.input.value.trim(),
        temperament: temperament.textarea.value.trim(),
        feeding: feeding.textarea.value.trim(),
        walks: walks.textarea.value.trim(),
        vet: vet.input.value.trim(),
        vetPhone: vetPhone.input.value.trim(),
        vetEmergency: vetEmergency.input.value.trim()
      };
    }
  };
}

/**
 * Shared multi-pet form for hub setup and settings.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ intro?: string, showIntro?: boolean }} [options]
 */
export function createPetCareFields(profile, options = {}) {
  const normalized = normalizePetCare(profile?.petCare);
  const wrap = document.createElement('div');
  wrap.className = 'settings-options settings-options--stacked';

  const hasPets = createSetupSelect(
    'Will sitters need to care for pets?',
    normalized.hasPets ? 'yes' : 'no',
    [
      { value: 'no', label: 'No pets to look after' },
      { value: 'yes', label: 'Yes — add pet details' }
    ],
    HUB_SETUP_FIELD_HELP.hasPets
  );

  const details = document.createElement('div');
  details.className = 'hub-setup-pet-details';

  const petsList = document.createElement('div');
  petsList.className = 'hub-setup-pet-list';

  const addPetButton = document.createElement('button');
  addPetButton.type = 'button';
  addPetButton.className = 'settings-action-button settings-action-button--secondary hub-setup-pet-add';
  addPetButton.textContent = 'Add another pet';

  /** @type {ReturnType<typeof createPetCard>[]} */
  let petCards = [];

  function syncRemoveButtons() {
    petCards.forEach((entry, index) => {
      entry.removeButton.hidden = petCards.length <= 1;
      const legend = entry.card.querySelector('.hub-setup-pet-card-legend');
      if (legend) {
        legend.textContent = index === 0 ? 'Pet details' : `Pet ${index + 1}`;
      }
    });
  }

  function renderPetCards() {
    petsList.replaceChildren();
    petCards = [];
    const pets = normalized.hasPets && normalized.pets.length ? normalized.pets : [emptyPetProfile()];
    for (const [index, pet] of pets.entries()) {
      const card = createPetCard(pet, index, syncRemoveButtons);
      petCards.push(card);
      petsList.append(card.card);
    }
    syncRemoveButtons();
  }

  addPetButton.addEventListener('click', () => {
    const card = createPetCard(emptyPetProfile(), petCards.length, syncRemoveButtons);
    petCards.push(card);
    petsList.append(card.card);
    syncRemoveButtons();
  });

  function syncDetailsVisibility() {
    const show = hasPets.select.value === 'yes';
    details.hidden = !show;
    addPetButton.hidden = !show;
  }

  hasPets.select.addEventListener('change', syncDetailsVisibility);
  details.append(petsList, addPetButton);
  renderPetCards();
  syncDetailsVisibility();

  if (options.showIntro !== false) {
    wrap.append(
      createSetupIntro(
        options.intro ??
          'These details are written into the Pets section when you import the starter House Guide. Nothing from another home is copied.'
      )
    );
  }

  wrap.append(hasPets.wrap, details);

  return {
    wrap,
    hasPets,
    readPetCare() {
      const hasPetCare = hasPets.select.value === 'yes';
      if (!hasPetCare) {
        return { hasPets: false, pets: [] };
      }
      const pets = petCards.map((entry) => entry.readPet()).filter((pet) => pet.name.trim());
      return {
        hasPets: pets.length > 0,
        pets
      };
    }
  };
}

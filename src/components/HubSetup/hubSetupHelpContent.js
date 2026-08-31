/** @typedef {import('../HelpGuide/helpGuide.js').HelpGuideSection} HelpGuideSection */

/** @type {HelpGuideSection[]} */
export const HUB_SETUP_HELP_SECTIONS = [
  {
    id: 'overview',
    title: 'Before you start',
    keywords: ['wizard', 'setup', 'onboarding', 'first time', 'hub setup'],
    blocks: [
      {
        type: 'p',
        text: 'The setup wizard walks you through naming your hub, adding contacts, optional pet care, guest access details, bin collection dates, optional My Day calendar, and importing a starter House Guide. You can change everything later in Settings → Home details.'
      },
      {
        type: 'h4',
        text: 'How the steps work'
      },
      {
        type: 'ul',
        items: [
          'Each step saves when you tap Continue — you can go Back without losing earlier steps.',
          'Your use case in step 1 decides whether you see the pets step and which starter guide is offered.',
          'Secrets (Wi‑Fi, lockbox, PIN) are stored on your hub, not in the app download.',
          'Tap the ? icon beside any field for a quick explanation, or open Help for this step for the full guide.'
        ]
      },
      {
        type: 'h4',
        text: 'After setup'
      },
      {
        type: 'p',
        text: 'Edit the imported guide in Guide Editor, publish topics, upload appliance manuals, then enable House Sitter Mode in Settings before you hand over the tablet.'
      }
    ]
  },
  {
    id: 'step-hub',
    title: 'Step 1 — Hub name & use case',
    keywords: ['hub name', 'use case', 'owner', 'airbnb', 'housesitter', 'guests'],
    blocks: [
      {
        type: 'p',
        text: 'This step sets how your hub appears in the header and which starter House Guide template fits your property.'
      },
      {
        type: 'h4',
        text: 'Hub name'
      },
      {
        type: 'p',
        text: 'A friendly name for this property — for example Rose Cottage Hub. It appears in the dashboard header and welcome copy. You can rename it anytime in Settings.'
      },
      {
        type: 'h4',
        text: 'How will guests use this hub?'
      },
      {
        type: 'table',
        headers: ['Option', 'Best for', 'Wizard extras'],
        rows: [
          ['Owner only', 'Personal reference on your own tablet', 'Light starter guide; no pets step'],
          ['Trusted housesitters / long stays', 'Weeks away with pet care', 'Pets step + sitter-focused starter guide'],
          ['Airbnb / short lets', 'Holiday lets and check-in info', 'Short-stay starter guide; no pets step'],
          ['Both sitters and short lets', 'Mixed use through the year', 'Pets step + combined starter guide']
        ]
      },
      {
        type: 'p',
        text: 'Changing the use case later updates which starter template is suggested if you re-open the wizard — it does not delete guide content you already imported.'
      }
    ]
  },
  {
    id: 'step-contacts',
    title: 'Step 2 — Contacts',
    keywords: ['contact', 'phone', 'email', 'primary', 'secondary', 'emergency'],
    blocks: [
      {
        type: 'p',
        text: 'Contact names are saved to your hub profile and can appear in the House Guide. Phone numbers and email addresses are stored as secure hub secrets — sitters only see them when you turn on sharing in Settings.'
      },
      {
        type: 'h4',
        text: 'Primary contact'
      },
      {
        type: 'p',
        text: 'Usually the main owner or person the sitter should call first. Name is required. Add a mobile number and email so sitters can reach you while you are away.'
      },
      {
        type: 'h4',
        text: 'Secondary contact (optional)'
      },
      {
        type: 'p',
        text: 'A backup person — partner, neighbour, or co-host. Leave blank if not needed. The same privacy rules apply: names in the guide when published; phone and email only when Sitter is here sharing is enabled.'
      }
    ]
  },
  {
    id: 'step-pets',
    title: 'Step 3 — Pet care',
    keywords: ['pet', 'dog', 'cat', 'vet', 'feeding', 'walks', 'bailey'],
    blocks: [
      {
        type: 'p',
        text: 'This step appears only for trusted housesitters or mixed use cases. Details are written into the Pets section when you import the starter House Guide — nothing is copied from another home.'
      },
      {
        type: 'h4',
        text: 'Will sitters need to care for pets?'
      },
      {
        type: 'p',
        text: 'Choose No if there are no pets, or Yes to reveal the detail fields. If you choose Yes, enter at least the pet\'s name before continuing.'
      },
      {
        type: 'h4',
        text: 'What to include'
      },
      {
        type: 'ul',
        items: [
          'Feeding routine — one line per meal makes it easy for sitters to scan.',
          'Walks & exercise — where the lead is, favourite routes, and any rules.',
          'Personality & rules — sofa access, nervous triggers, visitors allowed.',
          'Vet details — regular clinic plus an emergency out-of-hours number if you have one.'
        ]
      },
      {
        type: 'p',
        text: 'You can refine pet topics later in Guide Editor after import.'
      }
    ]
  },
  {
    id: 'step-access',
    title: 'Step 4 — Guest access',
    keywords: ['wifi', 'password', 'address', 'lockbox', 'pin', 'owner pin', 'secrets'],
    blocks: [
      {
        type: 'p',
        text: 'Wi‑Fi, address, lockbox code, and owner PIN live on your hub as encrypted secrets. Sitters never see them in the app files — only in protected House Guide blocks when you enable Settings → Sitter is here → Show home access details.'
      },
      {
        type: 'h4',
        text: 'Wi‑Fi'
      },
      {
        type: 'p',
        text: 'Network name and password for guest Wi‑Fi (or your main network if that is what you share). These feed Wi‑Fi QR and connection topics in the House Guide.'
      },
      {
        type: 'h4',
        text: 'Address of the property'
      },
      {
        type: 'p',
        text: 'Structured address for emergency services and sitter directions. Stored on the hub; shown in protected guide blocks when sharing is on.'
      },
      {
        type: 'h4',
        text: 'Lockbox / door code'
      },
      {
        type: 'p',
        text: 'Optional. Only revealed to sitters when sharing is enabled. Leave blank if you hand keys in person.'
      },
      {
        type: 'h4',
        text: 'Owner PIN (4 digits)'
      },
      {
        type: 'p',
        text: 'Unlocks owner mode after you enable House Sitter Mode. Press and hold the hub title in the header for five seconds, then enter this PIN. Optional during setup — you can set it later in Settings. Must be exactly four digits.'
      }
    ]
  },
  {
    id: 'step-bins',
    title: 'Step — Bin collections',
    keywords: ['bins', 'rubbish', 'recycling', 'garden waste', 'collection', 'council'],
    blocks: [
      {
        type: 'p',
        text: 'Add each collection date from your council calendar. These dates power the home screen bin reminder and the Bins app timeline — not just a PDF in the House Guide.'
      },
      {
        type: 'h4',
        text: 'How to add dates'
      },
      {
        type: 'ul',
        items: [
          'Open your council bin calendar (PDF or website) and add every date — do not guess from an alternating-week pattern.',
          'Choose rubbish, recycling, or garden waste for each date.',
          'Tick changed day for bank-holiday weeks when collection moves off the usual weekday.',
          'You can skip this step and return via Settings → Utilities → Open setup wizard.'
        ]
      },
      {
        type: 'p',
        text: 'Collection location and council website appear in the Bins app for guests on the tablet.'
      }
    ]
  },
  {
    id: 'step-calendar',
    title: 'Step — My Day calendar',
    keywords: ['calendar', 'my day', 'apple', 'google', 'ics', 'agenda'],
    blocks: [
      {
        type: 'p',
        text: 'Optional. Paste a private calendar subscribe link so My Day shows your personal agenda. Stored securely on the hub — no command line or server access needed.'
      },
      {
        type: 'h4',
        text: 'Apple Calendar'
      },
      {
        type: 'p',
        text: 'Calendar app → your calendar → Share → Public Calendar (or private subscribe link). Copy the webcal or https URL.'
      },
      {
        type: 'h4',
        text: 'Google Calendar'
      },
      {
        type: 'p',
        text: 'Settings → your calendar → Integrate calendar → Secret address in iCal format. Treat it like a password.'
      },
      {
        type: 'p',
        text: 'My Day is owner-only — house sitters never see your calendar. You can add or change the link later in Settings → Home details.'
      }
    ]
  },
  {
    id: 'step-guide',
    title: 'Starter House Guide',
    keywords: ['starter', 'import', 'guide', 'template', 'skip', 'publish'],
    blocks: [
      {
        type: 'p',
        text: 'Import a starter guide tailored to your use case, then edit and publish topics in Guide Editor. You can skip import and add content later — the app shows a neutral placeholder, not another home\'s data.'
      },
      {
        type: 'h4',
        text: 'Import starter guide'
      },
      {
        type: 'p',
        text: 'Creates draft topics on your hub (Wi‑Fi, routines, safety, pets if applicable, appliance manuals section, and so on). After import, open Guide Editor to personalise wording and photos, then publish each topic sitters should see.'
      },
      {
        type: 'h4',
        text: 'Skip for now'
      },
      {
        type: 'p',
        text: 'Tap Finish setup without importing. Add topics manually in Guide Editor whenever you are ready.'
      },
      {
        type: 'h4',
        text: 'After import'
      },
      {
        type: 'ul',
        items: [
          'Replace placeholder photos with your own in Guide Editor.',
          'Remove sections that do not apply (e.g. EV charger if you have none).',
          'Publish topics before enabling House Sitter Mode.',
          'Upload appliance PDFs in Appliance Manuals and link them from relevant guide topics.'
        ]
      }
    ]
  }
];

/** @type {Record<string, { hint?: string, helpText?: string, helpLabel?: string }>} */
export const HUB_SETUP_FIELD_HELP = {
  hubName: {
    hint: 'Shown in the header and welcome area.',
    helpText:
      'Pick a name sitters will recognise — often the property name. You can rename it later in Settings → Home details without affecting your guide content.'
  },
  useCase: {
    helpText:
      'This choice sets which wizard steps appear and which starter House Guide is offered. Owner only skips pets; housesitter and both include pet care. Airbnb focuses on check-in and short stays.'
  },
  primaryContactName: {
    hint: 'Required — the person sitters should call first.',
    helpText: 'The name can appear in published House Guide topics. Phone and email are stored securely and only shown when you enable sharing for sitters.'
  },
  secondaryContactName: {
    hint: 'Optional backup contact.',
    helpText: 'Useful for a partner, neighbour, or co-host. All fields can stay empty if you do not need a second contact.'
  },
  hasPets: {
    helpText:
      'Choose Yes only if sitters will feed, walk, or monitor pets. The starter guide adds a Pets section filled from the fields below.'
  },
  petName: {
    hint: 'Required when pet care is enabled.',
    helpText: 'Used in the imported Pets topic. Add species, feeding, and vet details so sitters have everything in one place.'
  },
  wifiSsid: {
    hint: 'Guest or main network name sitters should join.',
    helpText: 'Used for Wi‑Fi QR codes and connection instructions in the House Guide. Only visible to sitters when home access sharing is turned on.'
  },
  wifiPassword: {
    helpText: 'Stored as a hub secret. Leave blank when saving in Settings to keep the current password unchanged.'
  },
  propertyAddress: {
    helpText:
      'Structured address for emergencies and directions. The postcode also sets local weather on this tablet when you continue. Stored on the hub; revealed in protected guide blocks when sharing is enabled.'
  },
  lockbox: {
    hint: 'Optional — key safe or door entry code.',
    helpText: 'Only shown to sitters when you enable Show home access details. Leave blank if keys are handed over in person.'
  },
  ownerPin: {
    hint: 'Four digits — unlocks owner mode from the header logo.',
    helpText:
      'After House Sitter Mode is on, press and hold the hub title for five seconds and enter this PIN to restore owner apps. Optional during setup; must be exactly four digits if set.'
  },
  starterGuide: {
    helpText:
      'A draft House Guide matched to your use case. Import creates editable topics on your hub — nothing is copied from another property. Skip and use Guide Editor later if you prefer.'
  },
  binCollectionLocation: {
    hint: 'Where bins are collected from on collection day.',
    helpText:
      'Describe the collection point — for example end of the close, left-hand side. Shown in the Bins app.'
  },
  binCouncilUrl: {
    helpText: 'Link to your council\'s bin information or missed-bin reporting page. Optional.'
  },
  binNormalDay: {
    helpText: 'Your usual weekday when nothing has changed for bank holidays. Optional — helps anyone using the tablet understand the schedule.'
  },
  binValidFrom: {
    helpText: 'First date this council calendar applies. Leave blank to infer from your earliest collection date.'
  },
  binValidUntil: {
    helpText: 'Last date in this calendar period. After this date the app asks for an updated schedule.'
  },
  binAlertHours: {
    helpText:
      'How far ahead sitters see a prominent reminder on the home screen before each collection (from 6am on collection day). Default is 24 hours. Choose Off to hide reminders.'
  },
  calendarIcsUrl: {
    hint: 'Private subscribe link — not your normal calendar login.',
    helpText:
      'Paste the secret ICS or webcal URL from Apple, Google, or another provider. Stored on your hub as a secret. Leave blank to skip or keep the current link when saving in Settings.'
  }
};

/** @typedef {'owner' | 'housesitter' | 'airbnb' | 'both' | string} HubUseCase */

/**
 * Guest-aware copy for the bin schedule wizard step.
 * @param {HubUseCase} [useCase]
 */
export function getBinScheduleGuestCopy(useCase = 'owner') {
  const baseLocationHelp =
    'Describe the collection point — for example end of the close, left-hand side. Shown in the Bins app.';

  switch (useCase) {
    case 'airbnb':
      return {
        intro:
          'Add collection dates from your council calendar. Short-stay guests see the next collection on the home screen — useful when a stay crosses bin day. You can skip and add dates later via Settings → Utilities.',
        locationHint: 'Where guests should put bins on collection day.',
        locationHelpText: `${baseLocationHelp} Mention this in your checkout or House Guide if guests need to take rubbish out.`,
        normalDayHelp:
          'Your usual weekday when nothing has changed for bank holidays. Optional — helps guests spot when collection has moved.'
      };
    case 'housesitter':
      return {
        intro:
          'Add collection dates from your council calendar. Sitters see the next collection on the home screen before bin day. You can skip and add dates later via Settings → Utilities.',
        locationHint: 'Where sitters should leave bins on collection day.',
        locationHelpText: baseLocationHelp,
        normalDayHelp:
          'Your usual weekday when nothing has changed for bank holidays. Optional — helps sitters spot when collection has moved.'
      };
    case 'both':
      return {
        intro:
          'Add collection dates from your council calendar. Guests and sitters see the next collection on the home screen. You can skip and add dates later via Settings → Utilities.',
        locationHint: 'Where guests and sitters should leave bins on collection day.',
        locationHelpText: baseLocationHelp,
        normalDayHelp:
          'Your usual weekday when nothing has changed for bank holidays. Optional — helps guests and sitters spot when collection has moved.'
      };
    default:
      return {
        intro:
          'Add collection dates from your council calendar. You can skip and add them later in Settings → Utilities. Each date drives the home screen bin reminder.',
        locationHint: 'Where bins are collected from on collection day.',
        locationHelpText: baseLocationHelp,
        normalDayHelp: HUB_SETUP_FIELD_HELP.binNormalDay.helpText ?? ''
      };
  }
}

/**
 * @param {HubUseCase} [useCase]
 */
export function getBinScheduleFieldHelp(useCase = 'owner') {
  const copy = getBinScheduleGuestCopy(useCase);
  return {
    hint: copy.locationHint,
    helpText: copy.locationHelpText
  };
}

/**
 * @param {'hub' | 'contacts' | 'pets' | 'access' | 'bins' | 'calendar' | 'guide'} stepId
 */
export function hubSetupHelpSectionForStep(stepId) {
  const map = {
    hub: 'step-hub',
    contacts: 'step-contacts',
    pets: 'step-pets',
    access: 'step-access',
    bins: 'step-bins',
    calendar: 'step-calendar',
    guide: 'step-guide'
  };
  return map[stepId] ?? 'overview';
}

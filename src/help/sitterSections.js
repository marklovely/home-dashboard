/** @typedef {{ type: 'p', text: string } | { type: 'h4', text: string } | { type: 'ul', items: string[] } | { type: 'table', headers: string[], rows: string[][] }} HelpGuideBlock */

/** @typedef {{ id: string, title: string, keywords: string[], blocks: HelpGuideBlock[] }} HelpGuideSection */

/**
 * @typedef {{
 *   hosts: string,
 *   stayPlace: string,
 *   petName: string,
 *   petVisible: boolean,
 *   controlsVisible: boolean,
 *   petSummary: string,
 *   isDemo: boolean,
 *   surface?: 'hub' | 'public'
 * }} SitterHelpOptions
 */

/** Options for the public guest guide on the marketing site. */
export const PUBLIC_SITTER_HELP_OPTIONS = /** @type {SitterHelpOptions} */ ({
  hosts: 'your hosts',
  stayPlace: 'this home',
  petName: 'the pet',
  petVisible: true,
  controlsVisible: true,
  petSummary: '',
  isDemo: false,
  surface: 'public'
});

/**
 * Build sitter / guest guide sections.
 * @param {SitterHelpOptions} options
 * @returns {HelpGuideSection[]}
 */
export function buildSitterHelpSections(options) {
  const {
    hosts,
    stayPlace,
    petName,
    petVisible,
    controlsVisible,
    petSummary,
    isDemo,
    surface = 'hub'
  } = options;
  const isPublic = surface === 'public';

  /** @type {HelpGuideSection[]} */
  const sections = [
    {
      id: 'welcome',
      title: `Welcome to ${stayPlace}`,
      keywords: ['welcome', 'tablet', 'lovely home', 'start', 'sitter', 'guest', 'phone'],
      blocks: [
        {
          type: 'p',
          text: welcomeLead({ petVisible, petName, stayPlace, isPublic })
        },
        {
          type: 'p',
          text: welcomeAccess({ isDemo, isPublic, hosts })
        },
        {
          type: 'ul',
          items: [
            'Take your time — the House Guide has step-by-step instructions with photos.',
            ...(petVisible
              ? [`For ${petName}'s routine, start with the ${petName} card on the home screen.`]
              : []),
            `If you are unsure, call ${hosts} — numbers are in Emergency.`,
            ...(isPublic
              ? ['Your hub may hide pet care or home controls if the owner has not set those up.']
              : [])
          ]
        }
      ]
    },
    {
      id: 'home-screen',
      title: 'Home screen layout',
      keywords: ['home', 'essentials', 'cards', 'weather', 'bins', 'layout', 'launcher'],
      blocks: [
        {
          type: 'p',
          text: 'The home screen is split into Essentials (large cards) and Useful information (smaller cards).'
        },
        {
          type: 'h4',
          text: 'Essentials — tap these first'
        },
        {
          type: 'table',
          headers: ['App', 'What it is for'],
          rows: buildEssentialsTableRows(petVisible, petName, controlsVisible, hosts)
        },
        {
          type: 'h4',
          text: 'Useful information'
        },
        {
          type: 'ul',
          items: [
            'Weather — tap for the full forecast and any alerts. It follows the home’s location.',
            'Bins — next collection dates and where to leave the bins.'
          ]
        },
        {
          type: 'p',
          text: 'Need help finding something? Scroll down on Home and tap Open House Guide, or use the House Guide tab in the bottom bar.'
        }
      ]
    },
    {
      id: 'house-guide',
      title: 'House Guide',
      keywords: ['search', 'topics', 'photos', 'quick actions', 'guide', 'manual', 'find'],
      blocks: [
        {
          type: 'p',
          text: petVisible
            ? `The House Guide is your main reference — organised by area (Kitchen, ${petName}, and so on). Each topic answers one question with clear steps and pictures.`
            : 'The House Guide is your main reference — organised by area (Kitchen, Wi‑Fi, and so on). Each topic answers one question with clear steps and pictures.'
        },
        {
          type: 'p',
          text: houseGuideSecrets({ isDemo, hosts, isPublic })
        },
        {
          type: 'h4',
          text: 'Finding what you need'
        },
        {
          type: 'ul',
          items: [
            'Search from the Guide home — try everyday words like kettle, Netflix, dishwasher, or bbq.',
            'Browse by area and topic if you prefer to explore.',
            'Open appliance manual links inside topics to read the full PDF user guide.'
          ]
        },
        {
          type: 'h4',
          text: 'Quick action buttons'
        },
        {
          type: 'p',
          text: controlsVisible
            ? 'Some pages have buttons at the bottom — for example, firing a lighting scene or jumping to a related topic. Tap the button on the page; you do not need to remember Alexa or smart-home names.'
            : 'Some pages have buttons at the bottom for jumping to a related topic. Tap the button on the page when you see one.'
        },
        {
          type: 'p',
          text: 'Photos show which button or switch to use. Pinch or scroll if you need a closer look.'
        }
      ]
    }
  ];

  if (petVisible) {
    sections.push({
      id: 'pet-care',
      title: `${petName} — pet care`,
      keywords: ['pet', 'dog', 'cat', petName.toLowerCase(), 'walks', 'meals', 'bedtime', 'morning', 'feeding'],
      blocks: [
        {
          type: 'p',
          text: petSummary
            ? `${petName} is ${petSummary.startsWith('your') ? petSummary : `a ${petSummary}`}. The ${petName} app groups care into Morning, Walks, Meals, Bedtime, Health, and Quick Facts — each opens a full step-by-step page from the House Guide.`
            : `The ${petName} app groups pet care into Morning, Walks, Meals, Bedtime, Health, and Quick Facts — each opens a full step-by-step page from the House Guide.`
        },
        {
          type: 'ul',
          items: [
            'Morning — first toilet trip and starting the day.',
            'Walks — follow the guide for leads, routes, and safety.',
            'Meals — feeding times and where food is kept.',
            'Bedtime — evening settle routine.',
            'Health — vet details and anything to watch for.',
            'Quick Facts — age, breed, and temperament at a glance.'
          ]
        },
        {
          type: 'p',
          text: `If anything seems wrong with ${petName}, open Emergency → Vet or call ${hosts}.`
        }
      ]
    });
  }

  if (controlsVisible) {
    sections.push({
      id: 'home-controls',
      title: 'Home Controls',
      keywords: ['controls', 'lights', 'heating', 'scenes', 'alexa', 'bedtime', 'lighting'],
      blocks: [
        {
          type: 'p',
          text: 'Home Controls runs preset scenes for the house — lighting, heating, and lounge setups. Each button is labelled in plain English; tap once and wait a moment for things to change.'
        },
        {
          type: 'table',
          headers: ['Example button', 'Typical use'],
          rows: [
            ['Downstairs Lights', 'Turn on the main lights'],
            ['Bedtime', 'Settle the house for the night'],
            ['Watch Movie', 'Set up the lounge for a film'],
            ['Downstairs Off', 'Turn the main lights off'],
            ['Garage Light On / Off', 'Garage lighting'],
            ['Master Bedroom On / Off', 'Bedroom lights']
          ]
        },
        {
          type: 'p',
          text: `If a button does not seem to work, wait ten seconds and try once more. Still stuck? Call ${hosts} — do not keep tapping.`
        }
      ]
    });
  }

  sections.push(
    {
      id: 'emergency',
      title: 'Emergency app',
      keywords: ['emergency', 'call', 'vet', 'fuse', 'water', '999', 'help', hosts.toLowerCase()],
      blocks: [
        {
          type: 'p',
          text: 'Immediate danger — fire, medical, or security — call 999 first.'
        },
        {
          type: 'p',
          text: 'For everything else, Emergency brings the important numbers and house information together:'
        },
        {
          type: 'ul',
          items: [
            `${hosts} — tap for phone and email on this page (when hosts enable sharing).`,
            'Vet — address, opening times, and out-of-hours number on this page.',
            'Water stop tap — photo and location on this page.',
            'Fuse box — photo and location on this page.',
            'First aid — safety notes on this page.'
          ]
        },
        {
          type: 'p',
          text: 'Tap a card to call (phone icon) or open the matching House Guide page (guide icon).'
        }
      ]
    },
    {
      id: 'bins',
      title: 'Bins app',
      keywords: ['bins', 'rubbish', 'recycling', 'collection', 'garden waste', 'council'],
      blocks: [
        {
          type: 'p',
          text: 'Bins shows when collections are due and what goes in each bin. Check before bin day so nothing is missed.'
        },
        {
          type: 'ul',
          items: [
            'Household waste and recycling dates on the timeline.',
            'Garden waste dates when applicable — see what is accepted on the page.',
            'Collection information — where to leave bins and any local notes.',
            'Council recycling link for full rules if you are unsure what goes where.'
          ]
        },
        {
          type: 'p',
          text: `If a bin was not collected, see the note on the Bins page and contact ${hosts} if you need help.`
        }
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      keywords: ['settings', 'theme', 'dark', 'light', 'screensaver', 'wake', 'appearance'],
      blocks: [
        {
          type: 'p',
          text: 'Settings lets you adjust how the hub looks and behaves during your stay.'
        },
        {
          type: 'table',
          headers: ['Setting', 'What it does'],
          rows: [
            [
              'Theme',
              'Light, Dark, or Auto — pick what is easiest to read. Sun/moon in the header also switches light and dark'
            ],
            ['Clock format', '12-hour or 24-hour time in the header'],
            [
              'Screensaver',
              'After idle time, a dim clock appears — tap anywhere on the screen to wake the dashboard'
            ]
          ]
        },
        {
          type: 'p',
          text: isDemo
            ? 'Owner explore is available on this demo — hold the hub title and enter PIN 1234 to preview owner apps.'
            : `You cannot enable owner mode from here — that is for ${hosts} only.`
        }
      ]
    },
    {
      id: 'when-stuck',
      title: 'When you are stuck',
      keywords: ['help', 'stuck', 'unsure', 'problem', 'search', 'owners', 'what to do'],
      blocks: [
        {
          type: 'p',
          text: 'Most everyday questions are already in the House Guide. Try this order:'
        },
        {
          type: 'ul',
          items: buildWhenStuckItems(petVisible, petName, controlsVisible, hosts)
        },
        {
          type: 'p',
          text: isDemo
            ? 'This demo uses fictional sample content. On a real hub, photos and steps match the home you are staying in.'
            : 'The hub is meant to answer “how do I…?” without you needing to remember where everything is. If a page or photo does not match what you see in the house, call the hosts — they would rather know.'
        }
      ]
    }
  );

  return sections;
}

/**
 * @param {{ petVisible: boolean, petName: string, stayPlace: string, isPublic: boolean }} input
 */
function welcomeLead(input) {
  const care = input.petVisible
    ? `caring for ${input.petName}, using appliances, and getting help if something goes wrong.`
    : 'using appliances, finding your way around, and getting help if something goes wrong.';
  if (input.isPublic) {
    return `The hub is set up for a stay at ${input.stayPlace}. Open it on a phone, laptop, or wall tablet — everything you need is a tap away: ${care}`;
  }
  return `This tablet is set up for your stay at ${input.stayPlace}. Everything you need is a tap away — ${care}`;
}

/**
 * @param {{ isDemo: boolean, isPublic: boolean, hosts: string }} input
 */
function welcomeAccess(input) {
  if (input.isDemo) {
    return 'You are exploring a public demo hub. Sample data resets overnight. The bottom bar gives quick access to Home, House Guide, Emergency, and Settings.';
  }
  if (input.isPublic) {
    return `${input.hosts} send you the hub address. On a wall tablet you usually will not need a password. On your own phone you sign in with a one-time email code. The bottom bar gives quick access to Home, House Guide, Emergency, and Settings.`;
  }
  return 'You do not need a password on this tablet. The bottom bar gives quick access to Home, House Guide, Emergency, and Settings.';
}

/**
 * @param {{ isDemo: boolean, hosts: string, isPublic: boolean }} input
 */
function houseGuideSecrets(input) {
  if (input.isDemo) {
    return 'Some topics include Wi‑Fi, address, lockbox code, or contact details in highlighted boxes. On this demo hub those details are sample data only.';
  }
  if (input.isPublic) {
    return `Some topics include Wi‑Fi, address, lockbox code, or contact details in highlighted boxes. For a booked stay those details appear on the sit dates. On a wall tablet, ${input.hosts} turn them on when you arrive. If a box says details are not available yet, ask them or check Emergency. On Wi‑Fi → Connecting (or QR Code), scan the QR code with your phone camera to join the network once details are shared.`;
  }
  return `Some topics include Wi‑Fi, address, lockbox code, or contact details in highlighted boxes. ${input.hosts} turn these on when you arrive — if a box says details are not available yet, ask them or check Emergency. On Wi‑Fi → Connecting (or QR Code), scan the QR code with your phone camera to join the network once details are shared.`;
}

/**
 * @param {boolean} petVisible
 * @param {string} petName
 * @param {boolean} controlsVisible
 * @param {string} hosts
 */
function buildEssentialsTableRows(petVisible, petName, controlsVisible, hosts) {
  /** @type {string[][]} */
  const rows = [];
  if (petVisible) {
    rows.push([petName, `Walks, meals, bedtime, and health — ${petName}'s care guide`]);
  }
  rows.push(['House Guide', 'Appliances, Wi‑Fi, rooms, and how everything works']);
  if (controlsVisible) {
    rows.push(['Home Controls', 'Lighting, heating, and scenes — one tap each']);
  }
  rows.push(['Emergency', `Call ${hosts}, vet details, fuse box, water stop tap`]);
  return rows;
}

/**
 * @param {boolean} petVisible
 * @param {string} petName
 * @param {boolean} controlsVisible
 * @param {string} hosts
 */
function buildWhenStuckItems(petVisible, petName, controlsVisible, hosts) {
  /** @type {string[]} */
  const items = [
    'Search House Guide — type what you are looking for (e.g. heating, Wi‑Fi, coffee machine).',
    `Open Emergency — call ${hosts} if you are unsure or something seems wrong.`
  ];
  if (petVisible && controlsVisible) {
    items.push(`Check ${petName} or Home Controls if the question is about the pet or the lights.`);
  } else if (petVisible) {
    items.push(`Check ${petName} if the question is about pet care.`);
  } else if (controlsVisible) {
    items.push('Check Home Controls if the question is about the lights or heating.');
  }
  items.push('For urgent danger only — call 999, then the hosts.');
  return items;
}

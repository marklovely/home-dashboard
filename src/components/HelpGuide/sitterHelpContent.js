/** @typedef {{ type: 'p', text: string } | { type: 'h4', text: string } | { type: 'ul', items: string[] } | { type: 'table', headers: string[], rows: string[][] }} HelpGuideBlock */

/** @typedef {{ id: string, title: string, keywords: string[], blocks: HelpGuideBlock[] }} HelpGuideSection */

import { getHelpGuideSection, searchHelpGuideSections } from './helpGuide.js';

/** @type {HelpGuideSection[]} */
export const SITTER_HELP_SECTIONS = [
  {
    id: 'welcome',
    title: 'Welcome to Lovely Home',
    keywords: ['welcome', 'tablet', 'lovely home', 'start', 'sitter', 'guest'],
    blocks: [
      {
        type: 'p',
        text: 'This tablet is set up for your stay at Mark and Donna\'s home. Everything you need is a tap away — caring for Scooter, using appliances, and getting help if something goes wrong.'
      },
      {
        type: 'p',
        text: 'You do not need a password. The bottom bar gives quick access to Home, House Guide, Emergency, and Settings.'
      },
      {
        type: 'ul',
        items: [
          'Take your time — the House Guide has step-by-step instructions with photos.',
          'For Scooter\'s routine, start with the Scooter app on the home screen.',
          'If you are unsure, call Mark or Donna — numbers are in Emergency.'
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
        rows: [
          ['Scooter', 'Walks, meals, bedtime, and health — Scooter\'s care guide'],
          ['House Guide', 'Appliances, Wi‑Fi, rooms, and how everything works'],
          ['Home Controls', 'Lighting, heating, and scenes — one tap each'],
          ['Emergency', 'Call the owners, vet details, fuse box, water stop tap']
        ]
      },
      {
        type: 'h4',
        text: 'Useful information'
      },
      {
        type: 'ul',
        items: [
          'Weather — tap for the full forecast and any alerts.',
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
        text: 'The House Guide is your main reference — organised by area (Kitchen, Scooter, and so on). Each topic answers one question with clear steps and pictures.'
      },
      {
        type: 'p',
        text: 'Some topics include Wi‑Fi, address, lockbox code, or contact details in highlighted boxes. Mark and Donna turn these on when you arrive — if a box says details are not available yet, ask them or check Emergency. On Wi‑Fi → Connecting (or QR Code), scan the QR code with your phone camera to join the network once details are shared.'
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
        text: 'Some pages have buttons at the bottom — for example, firing a lighting scene or jumping to a related topic. Tap the button on the page; you do not need to remember Alexa or smart-home names.'
      },
      {
        type: 'p',
        text: 'Photos show which button or switch to use. Pinch or scroll if you need a closer look.'
      }
    ]
  },
  {
    id: 'scooter',
    title: 'Scooter app',
    keywords: ['scooter', 'dog', 'walks', 'meals', 'bedtime', 'morning', 'feeding'],
    blocks: [
      {
        type: 'p',
        text: 'Scooter is a lively Jack Russell. The Scooter app groups his care into Morning, Walks, Meals, Bedtime, Health, and Quick Facts — each opens a full step-by-step page from the House Guide.'
      },
      {
        type: 'ul',
        items: [
          'Morning — out of the crate, then into the back garden.',
          'Walks — roads around the house can be busy; follow the guide.',
          'Meals — morning and evening; food is in the kitchen.',
          'Bedtime — collar off before the crate; say “It\'s bedtime for dogs.”',
          'Health — excellent health; no daily medication.',
          'Quick Facts — age, breed, and temperament at a glance.'
        ]
      },
      {
        type: 'p',
        text: 'If anything seems wrong with Scooter, open Emergency → Vet or call Mark or Donna.'
      }
    ]
  },
  {
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
        text: 'If a button does not seem to work, wait ten seconds and try once more. Still stuck? Call the owners — do not keep tapping.'
      }
    ]
  },
  {
    id: 'emergency',
    title: 'Emergency app',
    keywords: ['emergency', 'call', 'mark', 'donna', 'vet', 'fuse', 'water', '999', 'help'],
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
          'Mark or Donna — tap for phone and email on this page (when hosts enable sharing).',
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
        text: 'If a bin was not collected, see the note on the Bins page and contact the owners if you need help.'
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
        text: 'Settings lets you adjust how the tablet looks and behaves during your stay.'
      },
      {
        type: 'table',
        headers: ['Setting', 'What it does'],
        rows: [
          ['Theme', 'Light, Dark, or Auto — pick what is easiest to read'],
          ['Clock format', '12-hour or 24-hour time in the header'],
          ['Screensaver', 'After idle time, a dim clock appears — tap anywhere on the screen to wake the dashboard']
        ]
      },
      {
        type: 'p',
        text: 'You cannot enable owner mode from here — that is for Mark and Donna only.'
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
        items: [
          'Search House Guide — type what you are looking for (e.g. heating, Wi‑Fi, coffee machine).',
          'Open Emergency — call Mark or Donna if you are unsure or something seems wrong.',
          'Check Scooter or Home Controls if the question is about the dog or the lights.',
          'For urgent danger only — call 999, then the owners.'
        ]
      },
      {
        type: 'p',
        text: 'The tablet is meant to answer “how do I…?” without you needing to remember where everything is. If a page or photo does not match what you see in the house, call us — we would rather know.'
      }
    ]
  }
];

/**
 * @param {string} [sectionId]
 * @returns {HelpGuideSection | undefined}
 */
export function getSitterHelpSection(sectionId) {
  return getHelpGuideSection(SITTER_HELP_SECTIONS, sectionId);
}

/**
 * @param {string} query
 */
export function searchSitterHelpSections(query) {
  return searchHelpGuideSections(SITTER_HELP_SECTIONS, query);
}

/** @typedef {{ type: 'p', text: string } | { type: 'h4', text: string } | { type: 'ul', items: string[] } | { type: 'table', headers: string[], rows: string[][] }} HelpGuideBlock */

/** @typedef {{ id: string, title: string, keywords: string[], blocks: HelpGuideBlock[] }} HelpGuideSection */

import { getHelpGuideSection, searchHelpGuideSections } from './helpGuide.js';

/** @type {HelpGuideSection[]} */
export const OWNER_HELP_SECTIONS = [
  {
    id: 'overview',
    title: 'Lovely Home Hub',
    keywords: ['home hub', 'dashboard', 'tablet', 'owner', 'lovely home'],
    blocks: [
      {
        type: 'p',
        text: 'Lovely Home Hub is your control centre for the wall tablet and your own browser. From here you manage the House Guide, appliance manuals, Alexa routines, and settings — then hand the tablet to sitters in House Sitter Mode when you go away.'
      },
      {
        type: 'p',
        text: 'Owner-only apps (Guide Editor, Appliance Manuals, My Day, Plex) stay hidden from sitters. The sitter tablet shows a simpler Lovely Home home screen with Scooter, House Guide, Controls, Emergency, Weather, and Bins.'
      },
      {
        type: 'ul',
        items: [
          'Open apps from the home screen grid.',
          'Use the header to switch Owner / Guest when previewing what sitters see.',
          'Enable House Sitter Mode in Settings before you leave — it persists across refreshes and restarts.'
        ]
      }
    ]
  },
  {
    id: 'owner-vs-guest',
    title: 'Owner vs Guest viewing',
    keywords: ['guest', 'owner', 'switcher', 'preview', 'viewing as', 'header'],
    blocks: [
      {
        type: 'p',
        text: 'The Viewing as switcher in the header lets you flip between Owner and Guest without locking the tablet.'
      },
      {
        type: 'table',
        headers: ['View', 'What you see'],
        rows: [
          ['Owner', 'All owner apps, My Day, Guide Editor, full Controls (Alexa routines)'],
          ['Guest', 'The same apps and layout sitters see — useful for previewing the House Guide']
        ]
      },
      {
        type: 'p',
        text: 'Guest view is a quick preview only. It does not hide owner apps from a determined sitter — use Enable House Sitter Mode in Settings when you actually hand over the tablet.'
      },
      {
        type: 'h4',
        text: 'Previewing the House Guide'
      },
      {
        type: 'p',
        text: 'Switch to Guest, open House Guide, and check published topics. Sitters never see unpublished drafts — publish in Guide Editor first.'
      }
    ]
  },
  {
    id: 'house-sitter-mode',
    title: 'House Sitter Mode',
    keywords: ['sitter mode', 'hand tablet', 'pin', 'unlock', 'logo', 'lock', 'guest'],
    blocks: [
      {
        type: 'p',
        text: 'When you are going away, enable House Sitter Mode so owner-only apps and personal information stay hidden. The tablet stays in sitter mode after refreshes and restarts until an owner unlocks it.'
      },
      {
        type: 'h4',
        text: 'Share Wi‑Fi and home details'
      },
      {
        type: 'p',
        text: 'Wi‑Fi passwords, the home address, contact numbers, and the key lockbox code live in Worker secrets — they never ship in the app bundle. When a sitter arrives, turn on Settings → Sitter is here → Show home access details to sitters. Protected blocks in the House Guide then fill in for sitters. Turn it off when they leave. You can flip this from your phone or laptop too — it applies to the whole home, not just one browser.'
      },
      {
        type: 'h4',
        text: 'Enable before you leave'
      },
      {
        type: 'ul',
        items: [
          'Open Settings → House sitter mode.',
          'Tap Enable House Sitter Mode and confirm.',
          'The home screen switches to Lovely Home with sitter apps only.',
          'Hand the tablet to your sitter — no PIN needed for them.'
        ]
      },
      {
        type: 'h4',
        text: 'Unlock as owner'
      },
      {
        type: 'p',
        text: 'Press and hold the Lovely Home logo in the header for five seconds. Enter your owner PIN to restore full access. You can also use Settings → Return to House Sitter Mode when you want to lock it again after a visit.'
      },
      {
        type: 'p',
        text: 'After unlocking, owner mode may lock again automatically after a period of inactivity — enter your PIN again if prompted.'
      }
    ]
  },
  {
    id: 'apps',
    title: 'Apps at a glance',
    keywords: ['controls', 'alexa', 'guide editor', 'manuals', 'my day', 'plex', 'settings', 'apps'],
    blocks: [
      {
        type: 'p',
        text: 'These apps appear on the owner home screen. Sitters only see the ones marked for guests.'
      },
      {
        type: 'table',
        headers: ['App', 'Purpose', 'Sitters'],
        rows: [
          ['Controls', 'Fire Alexa Virtual Button routines (lighting, heating, scenes)', 'Yes — as Home Controls'],
          ['Guide Editor', 'Write and publish House Guide topics', 'No'],
          ['Appliance Manuals', 'Upload PDF user guides for sitters', 'No — manuals open inside House Guide'],
          ['My Day', 'Your personal calendar for the week ahead', 'No'],
          ['Plex', 'Media hub (coming soon)', 'No'],
          ['Settings', 'Theme, display, screensaver, House Sitter Mode', 'Yes — limited options']
        ]
      },
      {
        type: 'h4',
        text: 'Controls (owner view)'
      },
      {
        type: 'p',
        text: 'Shows your configured Alexa Virtual Buttons. Sitters see a friendlier Home Controls grid with the same routines — labels like Downstairs Lights, Bedtime, and Watch Movie.'
      }
    ]
  },
  {
    id: 'guide-editor',
    title: 'Editing the House Guide',
    keywords: ['guide editor', 'publish', 'draft', 'writing guide', 'topics', 'house guide'],
    blocks: [
      {
        type: 'p',
        text: 'Guide Editor is where you maintain the sitter House Guide — areas, topics, photos, and quick action buttons. Changes are saved as drafts until you publish.'
      },
      {
        type: 'ul',
        items: [
          'Save draft while working; Publish topic when sitters should see it.',
          'Use Publish all changes for multiple pending edits.',
          'Set Audience to Owner notes only for content that should not appear on the sitter tablet.',
          'Preview with Guest view + House Guide after publishing.'
        ]
      },
      {
        type: 'h4',
        text: 'Writing guide'
      },
      {
        type: 'p',
        text: 'Open the Writing guide button inside Guide Editor for full help on block types, photos, quick actions, search keywords, and troubleshooting. That guide is the detailed reference — this owner guide covers the wider dashboard.'
      }
    ]
  },
  {
    id: 'appliance-manuals',
    title: 'Appliance Manuals',
    keywords: ['manual', 'pdf', 'upload', 'publish', 'appliance', 'user guide'],
    blocks: [
      {
        type: 'p',
        text: 'Upload PDF user guides so sitters can open them from House Guide topics. Management is owner-only.'
      },
      {
        type: 'ul',
        items: [
          'Open Appliance Manuals → Add manual.',
          'Choose a category, give the manual a clear name (e.g. Dishwasher), and upload the PDF.',
          'Publish when ready — sitters see published manuals linked from guide topics.',
          'Replace or delete uploads from the manual list; update topic links in Guide Editor if you rename a manual.'
        ]
      },
      {
        type: 'p',
        text: 'In Guide Editor, link a manual by name on relevant topics (e.g. washing machine, oven). Sitters tap the link inside House Guide to read the PDF.'
      }
    ]
  },
  {
    id: 'my-day',
    title: 'My Day',
    keywords: ['calendar', 'agenda', 'schedule', 'my day', 'events'],
    blocks: [
      {
        type: 'p',
        text: 'My Day shows your personal calendar — today, tomorrow, and later in the week. It is owner-only and never appears in House Sitter Mode.'
      },
      {
        type: 'p',
        text: 'If the calendar does not load, the Apple calendar feed may need configuring on the Worker. Unlock with your PIN after any server-side changes.'
      }
    ]
  },
  {
    id: 'hub-setup',
    title: 'Hub setup wizard',
    keywords: ['setup', 'wizard', 'onboarding', 'first time', 'hub name', 'starter guide', 'contacts'],
    blocks: [
      {
        type: 'p',
        text: 'The first-time setup wizard runs when you open Hub setup from Settings or on a new hub. It saves your hub name, contacts, guest access secrets, optional pet care, and offers a starter House Guide import.'
      },
      {
        type: 'h4',
        text: 'Step-by-step help'
      },
      {
        type: 'p',
        text: 'Inside the wizard, tap Hub setup guide for the full searchable reference, or Help for this step on each screen. Tap the ? icon beside any field for a quick explanation.'
      },
      {
        type: 'ul',
        items: [
          'Step 1 — Hub name and how guests will use the property (sets the starter template).',
          'Step 2 — Primary and optional secondary emergency contacts.',
          'Step 3 — Pet care (housesitter and mixed use cases only).',
          'Step 4 — Wi‑Fi, address, lockbox, and owner PIN (stored securely on the hub).',
          'Step 5 — Import a starter House Guide or skip and edit later.'
        ]
      },
      {
        type: 'p',
        text: 'You can reopen the wizard from Settings → Home details → Open setup wizard, or edit the same fields directly on that page.'
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    keywords: ['theme', 'clock', 'scale', 'screensaver', 'weather', 'location', 'appearance'],
    blocks: [
      {
        type: 'p',
        text: 'Settings controls how the dashboard looks and behaves on this tablet.'
      },
      {
        type: 'table',
        headers: ['Setting', 'What it does'],
        rows: [
          ['Theme', 'Light, Dark, or Auto (follows system)'],
          ['Clock format', '12-hour or 24-hour time in the header'],
          ['Home screen scale', 'Make launcher cards larger or smaller on the owner home screen'],
          ['Screensaver', 'Dim clock after idle time; tap anywhere to wake (especially useful in sitter mode)'],
          ['Weather location', 'Owner only — override the default home location for forecasts']
        ]
      },
      {
        type: 'p',
        text: 'Screen wake and kiosk behaviour on the wall tablet are managed by Fully Kiosk — not in this app.'
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    keywords: ['broken', 'error', 'fix', 'help', 'offline', 'pin', 'publish'],
    blocks: [
      {
        type: 'table',
        headers: ['Problem', 'What to try'],
        rows: [
          ['Sitters see old guide text', 'Publish in Guide Editor, then refresh the tablet'],
          ['Owner apps visible to sitter', 'Enable House Sitter Mode in Settings — Guest view alone is not enough'],
          ['Cannot unlock tablet', 'Hold the header logo for five seconds, then enter your PIN'],
          ['My Day empty or error', 'Check calendar feed configuration on the Worker'],
          ['Manual missing in House Guide', 'Publish the manual and check the topic link name matches'],
          ['Alexa routine fails', 'Confirm button number in Controls matches your Alexa setup'],
          ['Weather wrong location', 'Settings → Weather location, or reset to home default']
        ]
      }
    ]
  }
];

/**
 * @param {string} [sectionId]
 * @returns {HelpGuideSection | undefined}
 */
export function getOwnerHelpSection(sectionId) {
  return getHelpGuideSection(OWNER_HELP_SECTIONS, sectionId);
}

/**
 * @param {string} query
 */
export function searchOwnerHelpSections(query) {
  return searchHelpGuideSections(OWNER_HELP_SECTIONS, query);
}

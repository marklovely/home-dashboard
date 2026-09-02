/** @typedef {{ type: 'p', text: string } | { type: 'h4', text: string } | { type: 'ul', items: string[] } | { type: 'ol', items: string[] } | { type: 'qa', question: string, answer: string } | { type: 'table', headers: string[], rows: string[][] }} HelpGuideBlock */

/** @typedef {{ id: string, title: string, keywords: string[], blocks: HelpGuideBlock[] }} HelpGuideSection */

/** @type {HelpGuideSection[]} */
export const OWNER_HELP_SECTIONS = [
  {
    id: 'setup',
    title: 'Set it up',
    keywords: [
      'setup',
      'trial',
      'wizard',
      'url',
      'tablet',
      'fully kiosk',
      'sitter',
      'hardware',
      'pin',
      'home screen'
    ],
    blocks: [
      {
        type: 'p',
        text: 'Your hub is a private web address. Send it to a sitter on their phone, or open it on a wall tablet if you have one. Use the 7-day trial to fill in the House Guide — not a complimentary stay. No hardware to buy.'
      },
      {
        type: 'h4',
        text: 'What you need'
      },
      {
        type: 'ul',
        items: [
          'A browser — phone, laptop, or tablet. Sitters use the same hub URL you do. Nothing to buy.',
          'About 30 minutes for the setup wizard once your hub is live (usually around 10 minutes after checkout).',
          'Optional: a wall tablet — only if you want a screen in the house. We do not sell mounts, tablets, or kiosk hardware.'
        ]
      },
      {
        type: 'h4',
        text: 'After you start a trial'
      },
      {
        type: 'ol',
        items: [
          'Wait for the hub. The success page watches the build and shows an Open button plus a QR code when it answers — usually around 10 minutes.',
          'Sign in as owner. Open {your-name}.lovely-hub.com. Cloudflare emails a one-time code to the address you used at signup.',
          'Walk through the wizard. Hub name, contacts, Wi‑Fi, lockbox, bins, optional calendar, and a starter house guide.',
          'Set an owner PIN. That unlocks owner tools on any device — phone, laptop, or tablet.',
          'Share the URL. Send the hub address to your sitter, or open it yourself wherever you like.'
        ]
      },
      {
        type: 'h4',
        text: 'Send it to a sitter'
      },
      {
        type: 'p',
        text: 'This is the usual way. They open the hub on their own phone or laptop — no wall tablet required. Add every upcoming stay in one list.'
      },
      {
        type: 'ol',
        items: [
          'Schedule the stay. Settings → House sitter mode → add their email and dates (optional label for you). Book as many sits as you need.',
          'Seven days before. They sign in with a one-time email code and can read the house guide. Wi‑Fi, address, and lockbox stay hidden.',
          'On the sit dates. Those home-access details appear automatically. You do not need Sitter is here for a booked remote stay.',
          'After checkout. Their login is removed the day after the stay ends. Edit, extend, cancel, or end a stay early from the same list.',
          'Long-term sitter. Add their email as a permanent sitter login — not for one-off visits.'
        ]
      },
      {
        type: 'p',
        text: 'Sitters never see the guide editor, backups, or home-control buttons. On a wall tablet in the house, use Sitter is here so a guest without their own login can see home-access details. See Security for how access is locked down.'
      },
      {
        type: 'h4',
        text: 'Optional: wall tablet'
      },
      {
        type: 'p',
        text: 'If you want the hub on the wall as well, open the same URL on a tablet and add it to the home screen. Android users who want a locked, always-on display can use Fully Kiosk Browser — a separate app with its own licence, not part of Lovely Home.'
      },
      {
        type: 'ol',
        items: [
          'Install Fully and turn on Remote Admin (local network) with a password before you lock kiosk mode.',
          'Set the start URL to your hub, for example https://rose-cottage.lovely-hub.com.',
          'Keep cookies. If Fully clears cookies on reload, Cloudflare will ask for a login code every time the screen wakes.',
          'Choose an exit gesture and kiosk PIN, write them down, then enable kiosk mode.',
          'On the hub, enable House sitter mode on that device before you mount it.'
        ]
      },
      {
        type: 'p',
        text: 'Prefer not to use Fully? Chrome or Safari “Add to Home Screen” is enough for a simpler setup. If you use a kiosk PIN on a tablet, we cannot reset it — keep that with your household notes.'
      }
    ]
  },
  {
    id: 'common-questions',
    title: 'Common questions',
    keywords: [
      'faq',
      'trial',
      'price',
      'cancel',
      'billing',
      'demo',
      'public',
      'stay',
      'sitter'
    ],
    blocks: [
      {
        type: 'h4',
        text: 'Can I try before I pay?'
      },
      {
        type: 'p',
        text: 'Yes. Use the public demo with fictional data, or start a free trial for your own private hub. Use the week to fill in the guide before anyone stays — the trial is not a free guest stay. You can send the hub URL to a sitter; a wall tablet is optional.'
      },
      {
        type: 'h4',
        text: 'When am I charged?'
      },
      {
        type: 'p',
        text: 'Not at signup. The first charge happens when your 7-day trial ends, unless you cancel before then. Stripe shows the exact date during checkout.'
      },
      {
        type: 'h4',
        text: 'What if I cancel?'
      },
      {
        type: 'p',
        text: 'Cancel before the trial ends and you pay nothing. If you cancel later, access continues until the end of the paid period, then the hub is taken down and archived. Cancel from your account page or by emailing support.'
      },
      {
        type: 'h4',
        text: 'Can I book sits in advance?'
      },
      {
        type: 'p',
        text: 'Yes. Add each stay with dates and the sitter’s email under Settings → House sitter mode. They can read the house guide from 7 days before; Wi‑Fi, address, and lockbox appear on the sit dates; their login is removed the day after checkout. Add as many upcoming stays as you need.'
      },
      {
        type: 'h4',
        text: 'Is this a public app?'
      },
      {
        type: 'p',
        text: 'No. Each paying household gets a private hub — only people you invite can sign in.'
      }
    ]
  },
  {
    id: 'overview',
    title: 'Your home hub',
    keywords: ['home hub', 'dashboard', 'tablet', 'owner', 'lovely home', 'browser'],
    blocks: [
      {
        type: 'p',
        text: 'This hub is your control centre — on a wall tablet, phone, or laptop. From here you manage the House Guide, appliance manuals, Alexa routines, and settings, then share the hub with sitters when you go away.'
      },
      {
        type: 'p',
        text: 'Owner-only apps (Guide Editor, Appliance Manuals, My Day, Controls) stay hidden from sitters. The guest home screen is simpler: pet care when you have set it up, House Guide, Emergency, Weather, and Bins.'
      },
      {
        type: 'ul',
        items: [
          'Open apps from the home screen grid.',
          'Use Viewing as in the header to preview what sitters see, without locking the hub.',
          'Schedule remote stays, or enable House Sitter Mode on a wall tablet before you hand it over.'
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
        text: 'Guest view is a quick preview only. It does not hide owner apps from someone using the wall tablet — use Enable House Sitter Mode in Settings when you actually hand it over. Remote sitters on their own phone never see owner tools.'
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
    title: 'Sitters and House Sitter Mode',
    keywords: [
      'sitter mode',
      'hand tablet',
      'pin',
      'unlock',
      'logo',
      'lock',
      'guest',
      'stay',
      'schedule',
      'email',
      'otp'
    ],
    blocks: [
      {
        type: 'p',
        text: 'Most sitters open the hub on their own phone. A wall tablet in the house is optional. Settings → House sitter mode covers both.'
      },
      {
        type: 'h4',
        text: 'Scheduled remote stays'
      },
      {
        type: 'p',
        text: 'Add the sitter’s email and dates. You can book several sits in one list. They sign in with a one-time email code.'
      },
      {
        type: 'ul',
        items: [
          'From 7 days before the stay they can read the House Guide. Wi‑Fi, address, and lockbox stay hidden.',
          'On the sit dates those home-access details appear automatically. You do not need Sitter is here for a booked remote stay.',
          'The day after checkout their login is removed. Edit, extend, cancel, or end a stay early from the same list.',
          'For someone who should keep access (a long-term sitter), add their email as a permanent sitter login instead of a dated stay.'
        ]
      },
      {
        type: 'h4',
        text: 'Wall tablet — House Sitter Mode'
      },
      {
        type: 'p',
        text: 'When you hand over a tablet in the house, enable House Sitter Mode so owner-only apps stay hidden. The tablet stays in sitter mode after refreshes and restarts until an owner unlocks it.'
      },
      {
        type: 'ul',
        items: [
          'Open Settings → House sitter mode.',
          'Tap Enable House Sitter Mode and confirm.',
          'The home screen switches to the sitter layout.',
          'Hand the tablet over — they do not need a PIN.'
        ]
      },
      {
        type: 'h4',
        text: 'Share Wi‑Fi and home details on the tablet'
      },
      {
        type: 'p',
        text: 'Wi‑Fi, the home address, contact numbers, and the lockbox code are stored on your hub, not in the app download. On a wall tablet, turn on Settings → Sitter is here so a guest without their own login can see those details. Turn it off when they leave. You can flip this from your phone too — it applies to the whole home. Booked remote stays do not need this switch.'
      },
      {
        type: 'h4',
        text: 'Unlock as owner'
      },
      {
        type: 'p',
        text: 'When the tablet is locked in House Sitter Mode, owners need their PIN. In Settings → House sitter mode you can choose how to unlock: press and hold the hub logo for five seconds, tap Unlock owner mode at the top of Settings, or use both. Fully Kiosk admin exits are separate if you use kiosk lock.'
      },
      {
        type: 'p',
        text: 'After unlocking, use Settings → Return to House Sitter Mode to lock the tablet again. Owner mode may also lock after a period of inactivity.'
      }
    ]
  },
  {
    id: 'apps',
    title: 'Apps at a glance',
    keywords: ['controls', 'alexa', 'guide editor', 'manuals', 'my day', 'settings', 'apps', 'bins', 'weather'],
    blocks: [
      {
        type: 'p',
        text: 'These apps appear on the owner home screen. Sitters only see the ones marked for guests.'
      },
      {
        type: 'table',
        headers: ['App', 'Purpose', 'Sitters'],
        rows: [
          ['House Guide', 'How the home works — topics with photos', 'Yes — published topics only'],
          ['Emergency', 'Host contacts, vet, fuse box, stop tap', 'Yes'],
          ['Bins', 'Collection dates and where to leave bins', 'Yes'],
          ['Weather', 'Local forecast from your home address', 'Yes'],
          ['Controls', 'Alexa Virtual Button routines (lighting, heating, scenes)', 'No — owner only'],
          ['Guide Editor', 'Write and publish House Guide topics', 'No'],
          ['Appliance Manuals', 'Upload PDF user guides for sitters', 'No — manuals open inside House Guide'],
          ['My Day', 'Your personal calendar for the week ahead', 'No'],
          ['Settings', 'Theme, display, screensaver, sitters, home details', 'Yes — limited options']
        ]
      },
      {
        type: 'h4',
        text: 'Controls (owner view)'
      },
      {
        type: 'p',
        text: 'Shows your configured Alexa Virtual Buttons. Sitters cannot operate owner-only routines — unlock owner mode on the tablet when you need to run one, or add guest-safe buttons if you want sitters to use scenes.'
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
          'Set Audience to Owner notes only for content that should not appear for sitters.',
          'Preview with Guest view + House Guide after publishing.'
        ]
      },
      {
        type: 'h4',
        text: 'Writing guide'
      },
      {
        type: 'p',
        text: 'Open the Writing guide button inside Guide Editor for full help on block types, photos, quick actions, search keywords, and troubleshooting. That guide stays in the editor — this owner guide covers the wider hub.'
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
        text: 'If the calendar does not load, add or check the calendar feed in Settings → Home details (or the setup wizard). Unlock with your PIN after any server-side changes.'
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
        text: 'The first-time setup wizard runs when you open a new hub, or Hub setup from Settings → Utilities. It saves your hub name, contacts, guest access details, optional pet care, bins, optional calendar, and a starter House Guide.'
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
          'Hub name and how guests will use the property (sets the starter template).',
          'Primary and optional secondary emergency contacts.',
          'Pet care (housesitter and mixed use cases only).',
          'Wi‑Fi, address, lockbox, and owner PIN (stored securely on the hub).',
          'Bin collection dates.',
          'Optional My Day calendar feed.',
          'Import a starter House Guide or skip and edit later.'
        ]
      },
      {
        type: 'p',
        text: 'You can reopen the wizard from Settings → Utilities → Open setup wizard, or edit the same fields on Home details.'
      }
    ]
  },
  {
    id: 'bins',
    title: 'Bin reminders',
    keywords: [
      'bins',
      'rubbish',
      'recycling',
      'garden waste',
      'collection',
      'calendar',
      'valid until',
      'outdated'
    ],
    blocks: [
      {
        type: 'p',
        text: 'Bin reminders live in Settings → Bin reminders. Dates you add there drive the Bins app, home-screen alerts, and sitter banners — not a PDF in the House Guide.'
      },
      {
        type: 'h4',
        text: 'Add a new council calendar'
      },
      {
        type: 'ol',
        items: [
          'Open Settings → Bin reminders.',
          'Under Add collection dates, enter the first date and bin type from the council PDF.',
          'Choose Repeat (every 2 weeks is typical) and Repeat until the last date on the PDF.',
          'Tap Add dates to list. Do the same for recycling and garden waste.',
          'Scroll down and tap Save bin reminders. The list on this page is a draft until you save.'
        ]
      },
      {
        type: 'h4',
        text: 'If new dates do not show in the Bins app'
      },
      {
        type: 'p',
        text: 'Confirm the dates are in the list and that you tapped Save. An old “Schedule valid until” date no longer hides collections that are still ahead — save once after this update and the timeline should return. You can leave that field blank; the hub uses your last collection date.'
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    keywords: [
      'theme',
      'clock',
      'scale',
      'screensaver',
      'weather',
      'location',
      'appearance',
      'bins',
      'cameras',
      'backup'
    ],
    blocks: [
      {
        type: 'p',
        text: 'Settings controls how the hub looks and how this household is configured. Some panels are owner-only.'
      },
      {
        type: 'table',
        headers: ['Setting', 'What it does'],
        rows: [
          [
            'Appearance',
            'Light, Dark, or Auto. Sun/moon in the header also switches light and dark without opening Settings.'
          ],
          ['Clock format', '12-hour or 24-hour time in the header'],
          ['Home screen scale', 'Make launcher cards larger or smaller on the owner home screen'],
          ['Screensaver', 'Dim clock after idle time; tap anywhere to wake (especially useful in sitter mode)'],
          [
            'Weather location',
            'Forecasts follow the home postcode from Home details. Use this panel only to override that location on this device.'
          ],
          [
            'Bin reminders',
            'Collection dates, colours, and where sitters leave the bins. Add dates, then save — see the Bin reminders topic in this guide.'
          ],
          ['Cameras', 'Owner-only live view via go2rtc on your home network — not shown to sitters'],
          ['Utilities', 'Reopen the setup wizard, download an encrypted backup, or factory-reset this hub']
        ]
      },
      {
        type: 'p',
        text: 'Screen wake and kiosk behaviour on a wall tablet are managed by Fully Kiosk — not in this app.'
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    keywords: ['broken', 'error', 'fix', 'help', 'offline', 'pin', 'publish', 'weather'],
    blocks: [
      {
        type: 'table',
        headers: ['Problem', 'What to try'],
        rows: [
          ['Sitters see old guide text', 'Publish in Guide Editor, then refresh'],
          ['Owner apps visible on the wall tablet', 'Enable House Sitter Mode — Guest view alone is not enough'],
          ['Cannot unlock tablet', 'Use your configured unlock method in Settings → House sitter mode, then enter your PIN'],
          ['Sitter cannot sign in on their phone', 'Check their email and stay dates in Settings → House sitter mode'],
          ['My Day empty or error', 'Check the calendar feed in Home details'],
          ['Manual missing in House Guide', 'Publish the manual and check the topic link name matches'],
          ['Alexa routine fails', 'Confirm the button number in Controls matches your Alexa setup'],
          [
            'Weather wrong location',
            'Confirm the postcode on Home details. If you overrode it, Settings → Weather location, or reset to home default'
          ]
        ]
      }
    ]
  }
];

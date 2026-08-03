/**
 * Owner-facing setup copy for My Day (shown on test hubs and when calendar is not configured).
 */

/** @typedef {{ title: string, steps: string[], note?: string }} MyDayProviderGuide */

/** @type {MyDayProviderGuide[]} */
export const MY_DAY_CALENDAR_SETUP_GUIDES = [
  {
    title: 'Apple Calendar (Mac or iPhone)',
    steps: [
      'Open Calendar and choose a personal calendar (not a shared work calendar).',
      'Turn on Public Calendar or get the private subscribe link (Calendar → Settings → Share → Public Calendar).',
      'Copy the webcal:// or https:// link Apple provides.',
      'On the hub Worker, set secret APPLE_CALENDAR_ICS_URL to that full URL (production only — not the test hub).',
      'Deploy the Worker, then unlock Owner access on the tablet and open My Day.'
    ],
    note: 'Security is the secret URL plus Cloudflare Access — never put the link in git or the Pages build.'
  },
  {
    title: 'Google Calendar',
    steps: [
      'In Google Calendar on the web, open Settings → your calendar → Integrate calendar.',
      'Copy the Secret address in iCal format (ends with .ics — treat it like a password).',
      'Set Worker secret APPLE_CALENDAR_ICS_URL to that HTTPS link (the hub accepts any standard ICS feed, not only Apple).',
      'Deploy the Worker and open My Day after owner unlock.'
    ],
    note: 'Use a personal calendar. Rotate the secret address in Google if it is ever exposed.'
  },
  {
    title: 'Other providers (Outlook, Fastmail, etc.)',
    steps: [
      'Find the private ICS or webcal subscribe URL in your provider\'s calendar sharing settings.',
      'Ensure the URL is HTTPS (or webcal:// — the Worker normalises it).',
      'Set APPLE_CALENDAR_ICS_URL on the production Worker with wrangler secret put.',
      'My Day shows today, tomorrow, and the rest of the week — owner-only, never visible in House Sitter Mode.'
    ]
  }
];

export const MY_DAY_TEST_INTRO =
  'This test hub does not load anyone\'s personal calendar. Use the steps below when you configure production.';

export const MY_DAY_NOT_CONFIGURED_INTRO =
  'My Day is not connected to a calendar yet. Follow the steps below, then try again after setting the Worker secret.';

/**
 * @param {HTMLElement} host
 * @param {string} intro
 */
export function renderMyDaySetupGuide(host, intro = MY_DAY_NOT_CONFIGURED_INTRO) {
  host.replaceChildren();

  const page = document.createElement('section');
  page.className = 'app-page my-day-app my-day-app--setup';
  page.setAttribute('aria-label', 'My Day setup');

  const heading = document.createElement('h2');
  heading.className = 'my-day-setup-title';
  heading.textContent = 'Connect your calendar';

  const lead = document.createElement('p');
  lead.className = 'my-day-status';
  lead.textContent = intro;

  page.append(heading, lead);

  for (const guide of MY_DAY_CALENDAR_SETUP_GUIDES) {
    const section = document.createElement('section');
    section.className = 'my-day-setup-provider';

    const title = document.createElement('h3');
    title.className = 'my-day-section-title';
    title.textContent = guide.title;

    const list = document.createElement('ol');
    list.className = 'my-day-setup-steps';
    for (const step of guide.steps) {
      const item = document.createElement('li');
      item.textContent = step;
      list.append(item);
    }

    section.append(title, list);

    if (guide.note) {
      const note = document.createElement('p');
      note.className = 'my-day-setup-note subtle';
      note.textContent = guide.note;
      section.append(note);
    }

    page.append(section);
  }

  const docLink = document.createElement('p');
  docLink.className = 'my-day-setup-doc subtle';
  docLink.textContent =
    'Full deployment notes live in docs/my-day-deployment.md in the repository (Worker secrets and troubleshooting).';

  page.append(docLink);
  host.append(page);
}

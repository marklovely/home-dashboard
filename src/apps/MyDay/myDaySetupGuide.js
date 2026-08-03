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
      'In Hub setup (Calendar step) or Settings → Home details, paste the link into Private calendar link.',
      'Unlock Owner access on the tablet if needed, then open My Day.'
    ],
    note: 'The link is stored securely on your hub — only owners can set it, and sitters never see My Day.'
  },
  {
    title: 'Google Calendar',
    steps: [
      'In Google Calendar on the web, open Settings → your calendar → Integrate calendar.',
      'Copy the Secret address in iCal format (ends with .ics — treat it like a password).',
      'Paste that HTTPS link in Hub setup → Calendar step, or Settings → Home details.',
      'Open My Day after owner unlock — the hub accepts any standard ICS feed, not only Apple.'
    ],
    note: 'Use a personal calendar. Rotate the secret address in Google if it is ever exposed.'
  },
  {
    title: 'Other providers (Outlook, Fastmail, etc.)',
    steps: [
      'Find the private ICS or webcal subscribe URL in your provider\'s calendar sharing settings.',
      'Ensure the URL is HTTPS (or webcal:// — the hub normalises it).',
      'Paste the link in Hub setup or Settings → Home details.',
      'My Day shows today, tomorrow, and the rest of the week — owner-only, never visible in House Sitter Mode.'
    ]
  }
];

export const MY_DAY_TEST_INTRO =
  'This test hub does not load anyone\'s personal calendar. Use the steps below when you configure production.';

export const MY_DAY_NOT_CONFIGURED_INTRO =
  'My Day is not connected to a calendar yet. Follow the steps below, then add your private calendar link in Hub setup or Settings → Home details.';

/**
 * @param {HTMLElement} host
 * @param {string} intro
 * @param {{ onOpenSettings?: () => void }} [options]
 */
export function renderMyDaySetupGuide(host, intro = MY_DAY_NOT_CONFIGURED_INTRO, options = {}) {
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

  if (options.onOpenSettings) {
    const actionRow = document.createElement('div');
    actionRow.className = 'my-day-setup-actions';
    const settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.className = 'my-day-unlock-button';
    settingsButton.textContent = 'Open Settings → Home details';
    settingsButton.addEventListener('click', () => options.onOpenSettings?.());
    actionRow.append(settingsButton);
    page.append(actionRow);
  }

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

  host.append(page);
}

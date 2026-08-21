/** @typedef {import('../../components/HelpGuide/helpGuide.js').HelpGuideBlock} GuideEditorHelpBlock */

/** @typedef {import('../../components/HelpGuide/helpGuide.js').HelpGuideSection} GuideEditorHelpSection */

import { getHelpGuideSection, searchHelpGuideSections } from '../../components/HelpGuide/helpGuide.js';

/** @type {GuideEditorHelpSection[]} */
export const GUIDE_EDITOR_HELP_SECTIONS = [
  {
    id: 'overview',
    title: 'What you are building',
    keywords: ['structure', 'theory', 'areas', 'topics', 'blocks'],
    blocks: [
      {
        type: 'p',
        text: 'The House Guide is a structured manual for living in your home. Sitters open it on the tablet under House Guide.'
      },
      {
        type: 'p',
        text: 'You do not edit one long document. Content is organised in layers: Guide → Areas (Kitchen, Scooter…) → Topics (one page per question) → Blocks (paragraphs, steps, photos…) and optional Quick action buttons.'
      },
      {
        type: 'p',
        text: 'Each topic answers one question (“How do I use the dishwasher?”, “What is Scooter’s bedtime routine?”). Blocks keep pages scannable on a tablet and power search, Emergency cards, and the Scooter app.'
      }
    ]
  },
  {
    id: 'draft-publish',
    title: 'Draft vs publish',
    keywords: ['save', 'publish', 'draft', 'live', 'sitters'],
    blocks: [
      {
        type: 'p',
        text: 'Think of Save draft as “keep working privately” and Publish as “sitters can see this now”.'
      },
      {
        type: 'table',
        headers: ['Action', 'Who sees it'],
        rows: [
          ['Save draft', 'You in Guide Editor only'],
          ['Publish topic', 'House sitters in House Guide'],
          ['Publish all changes', 'Every topic with unpublished edits']
        ]
      },
      {
        type: 'p',
        text: 'The toolbar shows how many unpublished changes exist. Topics with drafts show a Draft label in the topic list. Sitters always receive the last published version.'
      }
    ]
  },
  {
    id: 'writing-topics',
    title: 'Writing a topic',
    keywords: ['title', 'subtitle', 'summary', 'audience', 'topic id'],
    blocks: [
      {
        type: 'p',
        text: 'Recommended order when editing a topic:'
      },
      {
        type: 'ul',
        items: [
          'Title — sitters see this in lists and search.',
          'Topic details — subtitle, summary, and audience (expand when needed).',
          'Blocks — main instructions (see Block types). Drag the handle to reorder.',
          'Search & links and Quick actions — optional; collapsed until you need them.',
          'Save draft, then Publish topic. Use Preview to check how the page looks without leaving the editor.'
        ]
      },
      {
        type: 'h4',
        text: 'Topic IDs'
      },
      {
        type: 'p',
        text: 'When creating a topic, the id is generated from the title automatically. Open Advanced to edit it before creating. Use letters, numbers, and hyphens (e.g. bin-day, scooter-bedtime). IDs appear in links and cannot be changed easily later.'
      }
    ]
  },
  {
    id: 'blocks',
    title: 'Block types',
    keywords: ['paragraph', 'steps', 'tip', 'warning', 'photo', 'callout'],
    blocks: [
      {
        type: 'p',
        text: 'Use Add block at the bottom of the topic editor.'
      },
      {
        type: 'table',
        headers: ['Block', 'Use for'],
        rows: [
          ['Paragraph', 'Normal explanation; optional heading'],
          ['Numbered steps', 'Sequences (meals, bedtime, leaving the house)'],
          ['Tip / Warning / Note', 'Hints, safety, neutral asides'],
          ['Details list', 'Label + value pairs (model, program number)'],
          ['Contacts', 'Names and numbers; optional phone/email links'],
          ['Photo', 'One image with alt text and caption'],
          ['Location', '“Where is the stop tap?”'],
          ['Expandable section', 'Extra detail sitters open if needed'],
          ['Place', 'Pub, walk, vet — address and dog-friendly flag']
        ]
      },
      {
        type: 'p',
        text: 'Private info blocks (Wi‑Fi, lockbox) are not editable here — they stay in secure configuration. Existing private blocks are preserved when you save.'
      },
      {
        type: 'h4',
        text: 'Writing tips'
      },
      {
        type: 'ul',
        items: [
          'One idea per block — split long text into paragraph + steps + tip.',
          'Use warnings for safety (roads, fuse box, water stop tap).',
          'Photos for “which button?” — clear, well-lit shots with descriptive alt text.',
          'Short headings — sitters read from arm’s length.'
        ]
      }
    ]
  },
  {
    id: 'photos',
    title: 'Photos',
    keywords: ['upload', 'library', 'alt', 'caption', 'replace', 'delete'],
    blocks: [
      {
        type: 'h4',
        text: 'Photo block (inside a topic)'
      },
      {
        type: 'ul',
        items: [
          'Add a Photo block.',
          'Prefer Upload photo — stored in cloud and attached automatically.',
          'Or expand Choose existing to pick from the library.',
          'Fill Alt text (required) and optional Caption.'
        ]
      },
      {
        type: 'h4',
        text: 'Photo library (toolbar)'
      },
      {
        type: 'p',
        text: 'Lists bundled originals and your uploads. Replace swaps an uploaded file; Delete removes uploads from cloud. Topics still using a deleted photo show “Image unavailable” until you pick another. Bundled originals are read-only.'
      }
    ]
  },
  {
    id: 'quick-actions',
    title: 'Quick actions',
    keywords: ['alexa', 'navigate', 'panel', 'button', 'routine'],
    blocks: [
      {
        type: 'p',
        text: 'Buttons at the bottom of a topic in House Guide (not visible in Guide Editor alone).'
      },
      {
        type: 'table',
        headers: ['Type', 'Purpose', 'Example'],
        rows: [
          ['Alexa routine', 'Fires a Virtual Button by number', 'Bedtime → button 2'],
          ['Open another topic', 'Jumps to another guide page', 'Feeding guide'],
          ['Info panel', 'Overlay with extra details', 'Treat rules']
        ]
      },
      {
        type: 'p',
        text: 'Each action needs a button label. Save draft and Publish topic. Fix validation errors (e.g. missing topic on a navigate action) before save.'
      }
    ]
  },
  {
    id: 'search-keywords',
    title: 'Search',
    keywords: ['keywords', 'find', 'netflix', 'synonyms'],
    blocks: [
      {
        type: 'p',
        text: 'Sitters search from the House Guide home screen. A topic matches title, subtitle, summary, your Search keywords, and text inside published blocks.'
      },
      {
        type: 'p',
        text: 'At the bottom of each topic, add comma-separated keywords for synonyms and brand names: Netflix, kettle, Alexa, bbq, charger. Publish after editing.'
      }
    ]
  },
  {
    id: 'owner-only',
    title: 'Owner-only topics',
    keywords: ['audience', 'hidden', 'guest', 'notes'],
    blocks: [
      {
        type: 'p',
        text: 'Set Audience to Owner notes only for reminders that should not appear on the sitter tablet. You see them in Guide Editor; sitters do not, and they are excluded from sitter search.'
      },
      {
        type: 'p',
        text: 'Most how-to content should stay on House sitters and guests so sitters are not forced to call you.'
      }
    ]
  },
  {
    id: 'topic-management',
    title: 'Topics & areas',
    keywords: ['create', 'reorder', 'delete', 'drag', 'new topic'],
    blocks: [
      {
        type: 'ul',
        items: [
          'Create — form at the bottom of an area’s topic list; new topics start unpublished.',
          'Reorder — drag topics within an area.',
          'Delete — bottom of topic editor; permanent after confirmation.'
        ]
      },
      {
        type: 'p',
        text: 'Guide intro text (collapsed at the top of Guide Editor) changes the title and subtitle on the House Guide home screen.'
      }
    ]
  },
  {
    id: 'sitter-preview',
    title: 'What sitters see',
    keywords: ['preview', 'guest', 'owner', 'house guide'],
    blocks: [
      {
        type: 'table',
        headers: ['Feature', 'You (Editor)', 'Sitters (House Guide)'],
        rows: [
          ['Draft edits', 'Yes', 'No'],
          ['Owner-only topics', 'Yes', 'No'],
          ['Published topics', 'Yes', 'Yes'],
          ['Quick actions', 'After publish', 'Yes']
        ]
      },
      {
        type: 'p',
        text: 'To preview: use Owner / Guest in the dashboard header, switch to Guest, open House Guide. Publish first — sitters never see unpublished drafts.'
      },
      {
        type: 'p',
        text: 'Link directly to a topic with #/house-guide/topic/your-topic-id on the dashboard URL.'
      }
    ]
  },
  {
    id: 'text-emojis',
    title: 'Text & emojis',
    keywords: ['plain text', 'emoji', 'bold', 'formatting', 'rich text'],
    blocks: [
      {
        type: 'p',
        text: 'Paragraph, tip, warning, note, location, expandable, and place description fields use a word-processor style editor — bold, lists, links, and emojis. What you see is what sitters get.'
      },
      {
        type: 'p',
        text: 'Press Enter for a new paragraph. Use the toolbar for formatting — no special codes or Markdown syntax.'
      },
      {
        type: 'h4',
        text: 'Emojis'
      },
      {
        type: 'p',
        text: 'Tap 😀 in the toolbar to open the full emoji picker. Use sparingly — Warning blocks are clearer than emoji alone for safety.'
      },
      {
        type: 'h4',
        text: 'Links'
      },
      {
        type: 'p',
        text: 'Use the Link button for https://, tel:, or mailto: URLs. Paste from Word or email is fine — extra formatting is stripped automatically.'
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    keywords: ['broken', 'error', 'old text', 'unavailable', 'publish'],
    blocks: [
      {
        type: 'table',
        headers: ['Problem', 'What to check'],
        rows: [
          ['Sitters see old text', 'Did you Publish? Wake tablet or hard-refresh.'],
          ['Image unavailable', 'Re-upload or pick a photo in the Photo block.'],
          ['Quick action fails', 'Publish topic; check button number in Controls app.'],
          ['Search misses topic', 'Add Search keywords and publish.'],
          ['Upload or reorder errors', 'Worker may need redeploy (technical).']
        ]
      }
    ]
  },
  {
    id: 'checklist',
    title: 'Quick checklist',
    keywords: ['checklist', 'start', 'workflow'],
    blocks: [
      {
        type: 'ul',
        items: [
          'Copy current guide to cloud once (first setup).',
          'Edit here in Guide Editor — not git — for day-to-day changes.',
          'Save draft while working; Publish when sitters should see it.',
          'Use steps, warnings, and photos for how-to pages.',
          'Add search keywords for how sitters actually ask.',
          'Upload photos with clear alt text.',
          'Preview in Guest view + House Guide app.'
        ]
      }
    ]
  }
];

/**
 * @param {string} [sectionId]
 * @returns {GuideEditorHelpSection | undefined}
 */
export function getGuideEditorHelpSection(sectionId) {
  return getHelpGuideSection(GUIDE_EDITOR_HELP_SECTIONS, sectionId);
}

export function searchGuideEditorHelpSections(query) {
  return searchHelpGuideSections(GUIDE_EDITOR_HELP_SECTIONS, query);
}

import { defineConfig } from 'tinacms';

const navigationIconOptions = [
  { label: 'Calendar', value: 'calendar' },
  { label: 'Speakers / people', value: 'users' },
  { label: 'Location', value: 'map-pin' },
  { label: 'Home', value: 'home' },
  { label: 'Announcement', value: 'megaphone' },
  { label: 'Presentation', value: 'presentation' },
  { label: 'Registration / edit', value: 'edit' },
  { label: 'Information / book', value: 'book' },
  { label: 'Archive', value: 'archive' },
  { label: 'Time', value: 'clock' },
  { label: 'Email', value: 'mail' },
  { label: 'Website', value: 'globe' },
  { label: 'Bookmark', value: 'bookmark' },
  { label: 'Featured / star', value: 'star' },
];

const tinaCollectionOrder = new Map([
  ['settings', 0],
  ['navigation', 1],
  ['homepageLayout', 2],
  ['venuePage', 3],
]);

// Tina otherwise follows declaration order. Pin the singleton/site-wide
// collections first while leaving all regular collections in their source order.
const orderTinaCollections = <T extends { name: string }>(collections: T[]) =>
  [...collections].sort((a, b) => {
    const aPriority = tinaCollectionOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = tinaCollectionOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });

const sessionListLabel = (values: Record<string, unknown>) => {
  // Tina needs one title field for its document list. This hidden derived value
  // makes sessions scannable without duplicating an editable title in content.
  const rawDate = values?.date;
  const date =
    rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : String(rawDate || '').slice(0, 10);
  const startTime = String(values?.startTime || '');
  const title = String(values?.title || '');
  const start = [date, startTime].filter(Boolean).join(' ');

  return [start, title].filter(Boolean).join(' — ') || 'New session';
};

// Local-mode editing: `tinacms dev` runs an ephemeral local backend and serves
// the editor at /admin. No database, no Tina Cloud account required. These env
// values are only used if you later connect Tina Cloud — they are ignored in
// local mode.
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.HEAD ||
  'main';

export default defineConfig({
  branch,
  clientId: process.env.TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  // Production site is built by Astro; Tina only needs to emit the local admin.
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'uploads',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: orderTinaCollections([
      // ---- Speakers -----------------------------------------------------
      {
        name: 'speaker',
        label: 'Speakers',
        path: 'src/content/speakers',
        format: 'md',
        ui: {
          filename: {
            // Slug derived from the speaker name, e.g. "Jane Doe" -> jane-doe
            slugify: (values) =>
              (values?.name || 'speaker')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, ''),
          },
        },
        fields: [
          { type: 'string', name: 'name', label: 'Full name', required: true, isTitle: true },
          { type: 'string', name: 'role', label: 'Role / Job title' },
          { type: 'string', name: 'company', label: 'Company / Organization' },
          { type: 'image', name: 'photo', label: 'Photo' },
          { type: 'boolean', name: 'featured', label: 'Feature on homepage' },
          {
            type: 'object',
            name: 'socials',
            label: 'Social links',
            fields: [
              { type: 'string', name: 'twitter', label: 'Twitter / X URL' },
              { type: 'string', name: 'linkedin', label: 'LinkedIn URL' },
              { type: 'string', name: 'website', label: 'Website URL' },
            ],
          },
          { type: 'rich-text', name: 'body', label: 'Bio', isBody: true },
        ],
      },

      // ---- Venue page ---------------------------------------------------
      {
        name: 'venuePage',
        label: 'Venue page',
        path: 'src/content/venue-page',
        format: 'md',
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          {
            type: 'string',
            name: 'name',
            label: 'Page name',
            required: true,
            isTitle: true,
            ui: { component: 'hidden' },
          },
          {
            type: 'image',
            name: 'heroImage',
            label: 'Hero image',
            description: 'Optional. Leave empty to show the venue page without an image.',
          },
          {
            type: 'string',
            name: 'heroImageAlt',
            label: 'Hero image alt text',
            description: 'Briefly describe the image for visitors using a screen reader.',
          },
          {
            type: 'object',
            name: 'dither',
            label: 'Image treatment',
            description: 'Live dither settings. These use the same values as Dither studio.',
            fields: [
              {
                type: 'boolean',
                name: 'enabled',
                label: 'Enable treatment',
                description: 'Turn this off to display the original image.',
              },
              {
                type: 'number',
                name: 'tint',
                label: 'Tint',
                description: '0–100. At 100 the light marks use the accent color.',
              },
              {
                type: 'number',
                name: 'patternSize',
                label: 'Pattern size',
                description: '6–30. Larger values make the dither pattern coarser.',
              },
              {
                type: 'number',
                name: 'brightness',
                label: 'Brightness',
                description: '0.2–1.5. The Dither studio default is 0.6.',
              },
              {
                type: 'number',
                name: 'contrast',
                label: 'Contrast',
                description: '0.5–2. The Dither studio default is 1.',
              },
              {
                type: 'number',
                name: 'scale',
                label: 'Scale',
                description: '100–300 percent. The image always covers its frame.',
              },
              {
                type: 'number',
                name: 'positionX',
                label: 'Horizontal framing',
                description: '0–100 percent. 50 keeps the image centered.',
              },
              {
                type: 'number',
                name: 'positionY',
                label: 'Vertical framing',
                description: '0–100 percent. 50 keeps the image centered.',
              },
            ],
          },
        ],
      },

      // ---- Sessions -----------------------------------------------------
      {
        name: 'session',
        label: 'Schedule / Sessions',
        path: 'src/content/sessions',
        format: 'md',
        defaultItem: {
          scheduleLabel: 'New session',
        },
        ui: {
          filename: {
            slugify: (values) =>
              (values?.title || 'session')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, ''),
          },
          beforeSubmit: async ({ values }) => ({
            ...values,
            scheduleLabel: sessionListLabel(values),
          }),
        },
        fields: [
          {
            type: 'string',
            name: 'scheduleLabel',
            label: 'Schedule list label',
            description: 'Generated automatically from the date, start time, and title.',
            required: true,
            isTitle: true,
            ui: { component: 'hidden' },
          },
          { type: 'string', name: 'title', label: 'Title', required: true },
          {
            type: 'datetime',
            name: 'date',
            label: 'Day',
            required: true,
            ui: { dateFormat: 'YYYY-MM-DD' },
          },
          { type: 'string', name: 'startTime', label: 'Start time (HH:mm)', required: true },
          { type: 'string', name: 'endTime', label: 'End time (HH:mm)' },
          {
            // Single reference to a room (allowed un-wrapped; only list
            // references need the object wrapper, see speakers above).
            type: 'reference',
            name: 'room',
            label: 'Room',
            collections: ['room'],
          },
          {
            type: 'string',
            name: 'track',
            label: 'Track',
            options: ['Keynote', 'Talk', 'Workshop', 'Panel', 'Break'],
          },
          {
            // Native Tina cross-reference. A `reference` field can't itself be
            // a list in Tina, so we wrap it in an object list — the canonical
            // pattern for "many speakers". Each item stores the referenced
            // speaker's file path, resolved on the Astro side via refToSlug()
            // in src/lib/refs.ts.
            type: 'object',
            name: 'speakers',
            label: 'Speakers',
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.speaker ?? 'Speaker' }),
            },
            fields: [
              {
                type: 'reference',
                name: 'speaker',
                label: 'Speaker',
                collections: ['speaker'],
              },
            ],
          },
          { type: 'rich-text', name: 'body', label: 'Abstract', isBody: true },
        ],
      },

      // ---- Rooms / Locations -------------------------------------------
      {
        name: 'room',
        label: 'Rooms / Locations',
        path: 'src/content/rooms',
        format: 'md',
        ui: {
          filename: {
            // e.g. "B2.0.1" -> b2-0-1, "B1 - Aula Castiglioni" -> b1-aula-castiglioni
            slugify: (values) =>
              (values?.name || 'room')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, ''),
          },
        },
        fields: [
          {
            type: 'string',
            name: 'name',
            label: 'Room name',
            description: 'As displayed, e.g. "B2.0.1" or "B1 - Aula Castiglioni"',
            required: true,
            isTitle: true,
          },
          { type: 'string', name: 'building', label: 'Building', required: true },
          {
            type: 'string',
            name: 'floor',
            label: 'Floor',
            description: 'e.g. 0, 1, -1, G',
            required: true,
          },
          {
            type: 'string',
            name: 'roomNumber',
            label: 'Room number',
            description: 'Optional — omit for rooms named after a person',
          },
          { type: 'rich-text', name: 'body', label: 'Notes', isBody: true },
        ],
      },

      // ---- Shared site settings ----------------------------------------
      {
        name: 'settings',
        label: 'Site settings',
        path: 'src/content/settings',
        format: 'md',
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          { type: 'string', name: 'name', label: 'Conference name', required: true, isTitle: true },
          { type: 'datetime', name: 'startDate', label: 'Start date', ui: { dateFormat: 'YYYY-MM-DD' } },
          { type: 'datetime', name: 'endDate', label: 'End date', ui: { dateFormat: 'YYYY-MM-DD' } },
          { type: 'string', name: 'venue', label: 'Venue' },
          { type: 'string', name: 'city', label: 'City' },
        ],
      },

      // ---- Homepage sections, content, order, and visibility ------------
      {
        name: 'homepageLayout',
        label: 'Homepage sections',
        path: 'src/content/homepage-layout',
        format: 'md',
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          {
            type: 'string',
            name: 'name',
            label: 'Layout name',
            required: true,
            isTitle: true,
            ui: { component: 'hidden' },
          },
          {
            type: 'object',
            name: 'hero',
            label: 'Hero',
            description: 'The hero is always visible and fixed at the top of the homepage.',
            fields: [
              {
                type: 'string',
                name: 'tagline',
                label: 'Tagline',
              },
              {
                type: 'rich-text',
                name: 'intro',
                label: 'Hero intro text',
                description: 'Rich text displayed inside the homepage hero.',
                parser: { type: 'markdown' },
              },
              {
                type: 'object',
                name: 'primaryCta',
                label: 'Primary button',
                fields: [
                  { type: 'string', name: 'label', label: 'Label' },
                  {
                    type: 'string',
                    name: 'href',
                    label: 'Link',
                    description: 'Internal path (e.g. /schedule) or full URL (https://…)',
                  },
                ],
              },
              {
                type: 'object',
                name: 'secondaryCta',
                label: 'Secondary button',
                description: 'Optional — leave empty to hide the secondary button',
                fields: [
                  { type: 'string', name: 'label', label: 'Label' },
                  {
                    type: 'string',
                    name: 'href',
                    label: 'Link',
                    description: 'Internal path (e.g. /speakers) or full URL (https://…)',
                  },
                ],
              },
            ],
          },
          {
            type: 'object',
            name: 'sections',
            label: 'Sections after the hero',
            description: 'The hero is permanently first and is not listed here. Drag these sections to reorder them.',
            list: true,
            templates: [
              {
                name: 'introduction',
                label: 'Introduction',
                ui: {
                  itemProps: (item) => ({
                    label: `${item?.enabled === false ? 'Hidden: ' : ''}Introduction`,
                  }),
                },
                fields: [
                  {
                    type: 'boolean',
                    name: 'enabled',
                    label: 'Show on homepage',
                    description: 'Turn this off to hide the section without deleting its content.',
                  },
                  {
                    type: 'rich-text',
                    name: 'content',
                    label: 'Introduction',
                    description: 'Rich text displayed in its own section below the homepage hero.',
                    parser: { type: 'markdown' },
                  },
                ],
              },
              {
                name: 'organizers',
                label: 'Conference organizers',
                ui: {
                  itemProps: (item) => ({
                    label: `${item?.enabled === false ? 'Hidden: ' : ''}Conference organizers`,
                  }),
                },
                fields: [
                  {
                    type: 'boolean',
                    name: 'enabled',
                    label: 'Show on homepage',
                    description: 'Turn this off to hide the section without deleting its content.',
                  },
                  {
                    type: 'string',
                    name: 'heading',
                    label: 'Section heading',
                    required: true,
                  },
                  {
                    type: 'string',
                    name: 'description',
                    label: 'Supporting text',
                    description: 'Displayed directly below the section heading.',
                    ui: { component: 'textarea' },
                  },
                  {
                    type: 'object',
                    name: 'groups',
                    label: 'Organizer groups',
                    description: 'Drag groups to reorder them.',
                    list: true,
                    ui: {
                      itemProps: (item) => ({
                        label: item?.title || 'Organizer group',
                      }),
                    },
                    fields: [
                      {
                        type: 'string',
                        name: 'title',
                        label: 'Group name',
                        description: 'For example, Conference Chairs or Program Chairs.',
                        required: true,
                      },
                      {
                        type: 'object',
                        name: 'people',
                        label: 'People',
                        description: 'Drag people to reorder them within this group.',
                        list: true,
                        ui: {
                          itemProps: (item) => ({
                            label: item?.name || 'Organizer',
                          }),
                        },
                        fields: [
                          {
                            type: 'string',
                            name: 'name',
                            label: 'Full name',
                            required: true,
                          },
                          {
                            type: 'string',
                            name: 'organization',
                            label: 'Organization',
                            required: true,
                          },
                          {
                            type: 'string',
                            name: 'linkedin',
                            label: 'LinkedIn URL',
                            description: 'Optional.',
                          },
                          {
                            type: 'string',
                            name: 'website',
                            label: 'Website URL',
                            description: 'Optional personal or organization profile.',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                name: 'speakers',
                label: 'Speakers',
                ui: {
                  itemProps: (item) => ({
                    label: `${item?.enabled === false ? 'Hidden: ' : ''}Speakers`,
                  }),
                },
                fields: [
                  {
                    type: 'boolean',
                    name: 'enabled',
                    label: 'Show on homepage',
                    description: 'Turn this off to hide the section.',
                  },
                ],
              },
              {
                name: 'schedule',
                label: 'Schedule',
                ui: {
                  itemProps: (item) => ({
                    label: `${item?.enabled === false ? 'Hidden: ' : ''}Schedule`,
                  }),
                },
                fields: [
                  {
                    type: 'boolean',
                    name: 'enabled',
                    label: 'Show on homepage',
                    description: 'Turn this off to hide the section.',
                  },
                ],
              },
              {
                name: 'editions',
                label: 'Previous editions',
                ui: {
                  itemProps: (item) => ({
                    label: `${item?.enabled === false ? 'Hidden: ' : ''}Previous editions`,
                  }),
                },
                fields: [
                  {
                    type: 'boolean',
                    name: 'enabled',
                    label: 'Show on homepage',
                    description: 'Turn this off to hide the section.',
                  },
                ],
              },
            ],
          },
        ],
      },

      // ---- Main navigation ---------------------------------------------
      {
        name: 'navigation',
        label: 'Navigation',
        path: 'src/content/navigation',
        format: 'md',
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          {
            type: 'string',
            name: 'name',
            label: 'Navigation name',
            required: true,
            isTitle: true,
            ui: { component: 'hidden' },
          },
          {
            type: 'object',
            name: 'items',
            label: 'Navbar items',
            description: 'Drag items to reorder them. Disabled items stay saved but are hidden from the site.',
            list: true,
            ui: {
              itemProps: (item) => ({
                label: `${item?.enabled === false ? 'Hidden: ' : ''}${item?.label || 'Navbar item'}`,
              }),
            },
            fields: [
              {
                type: 'string',
                name: 'icon',
                label: 'Icon',
                required: true,
                options: navigationIconOptions,
              },
              { type: 'string', name: 'label', label: 'Label', required: true },
              {
                type: 'string',
                name: 'href',
                label: 'Page / link',
                description: 'Use a site path such as /schedule, or a full URL for an external page.',
                required: true,
              },
              {
                type: 'boolean',
                name: 'enabled',
                label: 'Show in navbar',
                description: 'Turn this off to hide the item without deleting it.',
              },
            ],
          },
        ],
      },

      // ---- Previous editions -------------------------------------------
      {
        name: 'edition',
        label: 'Previous editions',
        path: 'src/content/editions',
        format: 'md',
        ui: {
          filename: { slugify: (values) => String(values?.year || 'edition') },
        },
        fields: [
          { type: 'string', name: 'year', label: 'Year', required: true, isTitle: true },
          { type: 'string', name: 'city', label: 'City', description: 'Optional' },
          { type: 'string', name: 'country', label: 'Country', description: 'Optional (e.g. "Scotland, UK")' },
          { type: 'string', name: 'venue', label: 'Hosting venue', description: 'Optional' },
          { type: 'string', name: 'url', label: 'Website URL', description: 'Optional' },
        ],
      },
    ]),
  },
});

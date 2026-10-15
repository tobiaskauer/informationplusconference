import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// These schemas mirror the Tina collections in tina/config.ts. Tina writes the
// markdown files into src/content/**; Astro reads them at build time. No DB.
//
// Note on cross-references: Tina models "many speakers" as an object list, each
// item holding a `speaker` reference whose value is a file PATH string
// (e.g. "src/content/speakers/jane-doe.md"), not a bare slug. We resolve those
// paths with refToSlug() (see src/lib/refs.ts) rather than Astro's reference().

const speakers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/speakers' }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    company: z.string().optional(),
    photo: z.string().optional(),
    featured: z.boolean().default(false),
    socials: z
      .object({
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
  }),
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sessions' }),
  schema: z.object({
    scheduleLabel: z.string().optional(),
    title: z.string(),
    date: z.coerce.date(),
    startTime: z.string(),
    endTime: z.string().optional(),
    // Tina `reference` value: a file-path string resolved via refToSlug().
    room: z.string().optional(),
    track: z.string().optional(),
    speakers: z.array(z.object({ speaker: z.string() })).default([]),
  }),
});

const rooms = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/rooms' }),
  schema: z.object({
    name: z.string(),
    building: z.string(),
    floor: z.string(), // string: handles "0", "-1", "G"
    roomNumber: z.string().optional(),
  }),
});

const settings = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/settings' }),
  schema: z.object({
    name: z.string(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    venue: z.string().optional(),
    city: z.string().optional(),
  }),
});

const organizerPerson = z.object({
  name: z.string(),
  organization: z.string(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});

const organizerGroup = z.object({
  title: z.string(),
  people: z.array(organizerPerson).default([]),
});

const homepageLayout = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/homepage-layout' }),
  schema: z.object({
    name: z.string(),
    hero: z
      .object({
        tagline: z.string().optional(),
        intro: z.string().optional(),
        primaryCta: z
          .object({ label: z.string().optional(), href: z.string().optional() })
          .optional(),
        secondaryCta: z
          .object({ label: z.string().optional(), href: z.string().optional() })
          .optional(),
      })
      .optional(),
    sections: z
      .array(
        z.discriminatedUnion('_template', [
          z.object({
            _template: z.literal('introduction'),
            enabled: z.boolean().default(true),
            content: z.string().optional(),
          }),
          z.object({
            _template: z.literal('organizers'),
            enabled: z.boolean().default(true),
            heading: z.string(),
            description: z.string().optional(),
            groups: z.array(organizerGroup).default([]),
          }),
          z.object({
            _template: z.literal('speakers'),
            enabled: z.boolean().default(true),
          }),
          z.object({
            _template: z.literal('schedule'),
            enabled: z.boolean().default(true),
          }),
          z.object({
            _template: z.literal('editions'),
            enabled: z.boolean().default(true),
          }),
        ])
      )
      .default([]),
  }),
});

const venuePage = defineCollection({
  // This is a singleton in practice (`main.md`), but remains a collection so
  // Tina and Astro can use the same Git-backed content workflow.
  loader: glob({ pattern: '**/*.md', base: './src/content/venue-page' }),
  schema: z.object({
    name: z.string(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    dither: z
      .object({
        enabled: z.boolean().default(true),
        tint: z.number().default(0),
        patternSize: z.number().default(12),
        brightness: z.number().default(0.6),
        contrast: z.number().default(1),
        scale: z.number().default(100),
        positionX: z.number().default(50),
        positionY: z.number().default(50),
      })
      .optional(),
  }),
});

const contactGroup = z.object({
  title: z.string(),
  email: z.string().optional(),
  people: z.array(z.object({ name: z.string(), organization: z.string().optional() })).default([]),
});

const calls = defineCollection({
  // One file per call; the file name is the URL slug under /call-for-submissions/.
  loader: glob({ pattern: '**/*.md', base: './src/content/calls' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(0),
    status: z.enum(['open', 'upcoming', 'closed']).default('upcoming'),
    intro: z.string().optional(),
    submit: z
      .object({ label: z.string().optional(), href: z.string().optional() })
      .optional(),
    keyDates: z.array(z.object({ label: z.string(), date: z.string() })).default([]),
    contacts: z.array(contactGroup).default([]),
  }),
});

const registrationPage = defineCollection({
  // Singleton in practice (`main.md`), like venuePage.
  loader: glob({ pattern: '**/*.md', base: './src/content/registration-page' }),
  schema: z.object({
    name: z.string(),
    intro: z.string().optional(),
    cta: z
      .object({ label: z.string().optional(), href: z.string().optional() })
      .optional(),
  }),
});

const navigation = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/navigation' }),
  schema: z.object({
    name: z.string(),
    items: z
      .array(
        z.object({
          icon: z.string(),
          label: z.string(),
          // Optional when the item only opens a dropdown of `children`.
          href: z.string().optional(),
          enabled: z.boolean().default(true),
          children: z
            .array(
              z.object({
                label: z.string(),
                href: z.string(),
                enabled: z.boolean().default(true),
              })
            )
            .default([]),
        })
      )
      .default([]),
  }),
});

const editions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/editions' }),
  schema: z.object({
    year: z.string(),
    city: z.string().optional(),
    country: z.string().optional(),
    venue: z.string().optional(),
    url: z.string().optional(),
  }),
});

export const collections = {
  speakers,
  sessions,
  rooms,
  editions,
  settings,
  homepageLayout,
  venuePage,
  calls,
  registrationPage,
  navigation,
};

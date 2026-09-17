import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { VENUE_DETAILS_ARE_PUBLIC } from './venue';

type Speaker = CollectionEntry<'speakers'>;
type Session = CollectionEntry<'sessions'>;
type Room = CollectionEntry<'rooms'>;

/**
 * Tina stores a `reference` value as the referenced file's path, e.g.
 * "src/content/speakers/jane-doe.md". Astro's glob loader uses the basename
 * (without extension) as the entry id, e.g. "jane-doe". This bridges the two
 * regardless of any path prefix Tina writes.
 */
export function refToSlug(ref: string): string {
  return ref.split('/').pop()!.replace(/\.[^.]+$/, '');
}

/** Resolve a session's `speakers` references to actual speaker entries. */
export async function resolveSpeakers(session: Session): Promise<Speaker[]> {
  const entries = await Promise.all(
    session.data.speakers.map(({ speaker }) => getEntry('speakers', refToSlug(speaker)))
  );
  return entries.filter((e): e is Speaker => Boolean(e));
}

/** Reverse lookup: every session that references the given speaker. */
export async function sessionsForSpeaker(speakerId: string): Promise<Session[]> {
  const all = await getCollection('sessions');
  return all
    .filter((s) => s.data.speakers.some(({ speaker }) => refToSlug(speaker) === speakerId))
    .sort(compareSessions);
}

/** Resolve a session's `room` reference to its room entry (if any). */
export async function resolveRoom(session: Session): Promise<Room | undefined> {
  if (!VENUE_DETAILS_ARE_PUBLIC || !session.data.room) return undefined;
  return getEntry('rooms', refToSlug(session.data.room));
}

/** Reverse lookup: every session held in the given room. */
export async function sessionsForRoom(roomId: string): Promise<Session[]> {
  if (!VENUE_DETAILS_ARE_PUBLIC) return [];

  const all = await getCollection('sessions');
  return all
    .filter((s) => s.data.room && refToSlug(s.data.room) === roomId)
    .sort(compareSessions);
}

/** Chronological sort: by day, then start time. */
export function compareSessions(a: Session, b: Session): number {
  const byDate = a.data.date.getTime() - b.data.date.getTime();
  if (byDate !== 0) return byDate;
  return (a.data.startTime || '').localeCompare(b.data.startTime || '');
}

/** Shared venue data — all buildings share one campus address. */
export const VENUE = {
  campus: ['Department of Design'],
  address: 'Via Durando 10, 20158 Milan, Italy',
  addressLines: ['Via Durando 10, 20158, Milan', 'Italy'],
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Department of Design, Via Durando 10, 20158 Milan, Italy'),
} as const;

/**
 * Detailed venue information is intentionally private during the first release.
 * When it is time to publish the travel directions and room information, change
 * this one value from `false` to `true`. The "Getting there" section, venue room
 * list, individual room pages, and room names attached to sessions will all
 * become public together.
 */
export const VENUE_DETAILS_ARE_PUBLIC = false;

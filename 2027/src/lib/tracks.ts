/**
 * Icon name for a session's track tag. "Break" is one label but splits visually
 * into coffee vs. cutlery (lunch). Returns null when a track has no icon yet
 * Icons live in src/icons/.
 */
export function trackIcon(track?: string, title?: string): string | null {
  switch ((track ?? '').toLowerCase()) {
    case 'keynote':
      return 'presentation-solid';
    case 'talk':
      return 'mic-solid';
    case 'panel':
      return 'chat-solid';
    case 'workshop':
      return 'draw-solid';
    case 'break':
      return /lunch/i.test(title ?? '') ? 'cutlery-solid' : 'coffee-2-solid';
    default:
      return null;
  }
}

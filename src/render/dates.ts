/**
 * Outlets write dates as ISO with an offset, or as "2026/11/13 14:59:46" / "2026-11-11 08:00:01" with
 * no zone at all, which is Jakarta time. Read those as WIB, not as the reader's own time zone.
 */
export function parseNewsDate(value: string): Date {
  const local = /^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (local) {
    const [, y, mo, d, hh, mm, ss = '00'] = local;
    return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}+07:00`);
  }
  return new Date(value);
}

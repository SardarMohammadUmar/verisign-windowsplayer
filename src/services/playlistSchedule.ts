import type { Playlist, PlaylistSchedule } from '../types';

function parseLocalDateTime(dateStr: string | null | undefined, timeStr: string | null | undefined): Date | null {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Custom schedule window; null if invalid or not Custom. */
export function getCustomScheduleWindow(schedule: PlaylistSchedule | null | undefined): {
  start: Date;
  end: Date;
} | null {
  if (!schedule || schedule.schedule_type !== 'Custom') return null;
  const start = parseLocalDateTime(schedule.custom_start_date, schedule.custom_start_time);
  const end = parseLocalDateTime(schedule.custom_end_date, schedule.custom_end_time);
  if (!start || !end) return null;
  if (end.getTime() < start.getTime()) return null;
  return { start, end };
}

/**
 * Direct (non-layout) playlists only.
 * - No schedule → always playable.
 * - schedule_type !== "Custom" → not playable (unsupported).
 * - Custom → playable only while start <= now <= end (single run, inclusive end).
 */
export function isDirectPlaylistPlayableNow(playlist: Playlist, now: Date): boolean {
  if (!playlist.schedule) return true;
  const sch = playlist.schedule;
  if (sch.schedule_type !== 'Custom') return false;
  const win = getCustomScheduleWindow(sch);
  if (!win) return false;
  const t = now.getTime();
  return t >= win.start.getTime() && t <= win.end.getTime();
}

export function filterPlayableDirectPlaylists(playlists: Playlist[] | undefined, now: Date): Playlist[] {
  if (!playlists?.length) return [];
  return playlists.filter((p) => isDirectPlaylistPlayableNow(p, now));
}

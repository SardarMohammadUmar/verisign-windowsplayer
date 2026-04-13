import type { CMSResponse, Media } from '../types';
import { filterPlayableDirectPlaylists } from '../services/playlistSchedule';

/** Media files to cache: full layout media, or only direct playlists that are playable now. */
export function collectCacheableMedia(data: CMSResponse): Media[] {
  const out: Media[] = [];
  if (data.layoutSelected && data.layout) {
    for (const sec of data.layout.sections) {
      for (const pl of sec.playlists || []) {
        for (const m of pl.media || []) out.push(m);
      }
    }
    return out;
  }
  const playable = filterPlayableDirectPlaylists(data.playlists, new Date());
  for (const pl of playable) {
    for (const m of pl.media || []) out.push(m);
  }
  return out;
}

import type { Playlist } from '../types';

/** Non-empty playlists sorted by `order` then `id`. */
export function sortedPlayablePlaylists(playlists: Playlist[]): Playlist[] {
  return [...playlists]
    .filter((p) => p.media && p.media.length > 0)
    .sort((a, b) => {
      const oa = a.order ?? 0;
      const ob = b.order ?? 0;
      if (oa !== ob) return oa - ob;
      return a.id - b.id;
    });
}

export interface PlaybackIndices {
  playlistIndex: number;
  mediaIndex: number;
  cycle: number;
}

/**
 * Advance to the next media item, wrapping playlists in order.
 * Fixes single-item playlists: they advance to the next playlist instead of looping forever on one playlist.
 */
export function advancePlaybackIndices(
  state: PlaybackIndices,
  playlists: Playlist[]
): PlaybackIndices {
  const pls = sortedPlayablePlaylists(playlists);
  if (!pls.length) {
    return { ...state, cycle: state.cycle + 1 };
  }

  let pl = Math.min(Math.max(0, state.playlistIndex), pls.length - 1);
  let mi = Math.min(Math.max(0, state.mediaIndex), pls[pl].media.length - 1);
  const n = pls[pl].media.length;
  const totalPlaylists = pls.length;

  const onlyOneItemEverywhere = totalPlaylists === 1 && n === 1;

  if (n === 1) {
    if (totalPlaylists > 1) {
      const nextPl = (pl + 1) % totalPlaylists;
      return {
        playlistIndex: nextPl,
        mediaIndex: 0,
        cycle: state.cycle + (nextPl === 0 ? 1 : 0),
      };
    }
    return { playlistIndex: 0, mediaIndex: 0, cycle: state.cycle + 1 };
  }

  if (mi < n - 1) {
    return { playlistIndex: pl, mediaIndex: mi + 1, cycle: state.cycle };
  }

  if (pl < totalPlaylists - 1) {
    return { playlistIndex: pl + 1, mediaIndex: 0, cycle: state.cycle };
  }

  return { playlistIndex: 0, mediaIndex: 0, cycle: state.cycle + 1 };
}

/** True when the only item in the entire rotation is this single video (allow infinite loop). */
export function shouldLoopVideoIntervalZero(playlists: Playlist[]): boolean {
  const pls = sortedPlayablePlaylists(playlists);
  return pls.length === 1 && pls[0].media.length === 1;
}

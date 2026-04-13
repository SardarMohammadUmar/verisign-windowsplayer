export interface Screen {
  id: number;
  name: string;
  location: string;
  status: string;
  connected: number;
  screen_code: string;
  remote_access_id: string;
}

export interface Media {
  id: number;
  url: string;
  type: 'image' | 'video' | 'html';
  interval: number;
  rotation?: number; // Rotation in degrees (0, 90, 180, 270)
}

/** Schedule payload from CMS (Custom-only logic is enforced in playlistSchedule). */
export interface PlaylistSchedule {
  schedule_type?: string | null;
  custom_start_date?: string | null;
  custom_end_date?: string | null;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
  [key: string]: unknown;
}

export interface Playlist {
  id: number;
  name: string;
  /** Sort order from CMS (lower first). */
  order?: number;
  media: Media[];
  schedule?: PlaylistSchedule | null;
}

export interface Section {
  id: number;
  name: string;
  order?: number;
  width_px: number;
  height_px: number;
  margin_top_px: number;
  margin_left_px: number;
  playlists: Playlist[];
}

export interface Layout {
  id: number;
  name: string;
  width: number;
  height: number;
  sections: Section[];
}

export interface CMSResponse {
  layoutSelected: boolean;
  screen: Screen;
  layout?: Layout;
  playlists?: Playlist[];
}

export interface FirebaseScreen {
  connected: boolean;
  hasPlaylist: boolean;
  /** When true, player clears caches and reloads (then CMS should set back to false). */
  clearCache?: boolean;
  /** Milliseconds since epoch; updated periodically for CMS activity detection */
  lastActive?: number;
  lastUpdated: number;
  location: string;
  name: string;
  online: boolean;
  playlistIds: string;
  remote_access_id: string;
  screen_code: string;
  status: string;
}

import type { Media } from '../types';

declare global {
  interface Window {
    electronAPI?: {
      getMediaCachePath: () => Promise<string>;
      checkFileExists: (filePath: string) => Promise<boolean>;
      saveMediaFile: (filePath: string, buffer: ArrayBuffer) => Promise<boolean>;
      clearMediaCacheDir?: () => Promise<boolean>;
    };
  }
}

let cacheBasePath: string = '';

export async function initializeMediaCache(): Promise<void> {
  if (!window.electronAPI) {
    console.warn('Electron API not available - media caching will be limited');
    // Use a fallback path for browser testing
    cacheBasePath = '/media-cache';
    return;
  }
  cacheBasePath = await window.electronAPI.getMediaCachePath();
}

export function getCachedMediaPath(media: Media): string {
  const extension = media.url.split('.').pop()?.split('?')[0] || 'mp4';
  return `${cacheBasePath}/${media.id}.${extension}`;
}

export async function isMediaCached(media: Media): Promise<boolean> {
  if (!window.electronAPI) {
    return false;
  }
  const cachedPath = getCachedMediaPath(media);
  return await window.electronAPI.checkFileExists(cachedPath);
}

export async function cacheMedia(media: Media, baseUrl: string): Promise<string> {
  const cachedPath = getCachedMediaPath(media);
  
  if (await isMediaCached(media)) {
    return `file://${cachedPath}`;
  }

  try {
    // Construct full URL
    const mediaUrl = media.url.startsWith('http') 
      ? media.url 
      : `${baseUrl}${media.url}`;

    console.log('Downloading media:', mediaUrl);
    
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    // Use Electron IPC to save file
    if (window.electronAPI && window.electronAPI.saveMediaFile) {
      const saved = await window.electronAPI.saveMediaFile(cachedPath, arrayBuffer);
      if (saved) {
        console.log('Media cached:', cachedPath);
        return `file://${cachedPath}`;
      }
    }
    
    // Fallback to URL if caching fails
    return mediaUrl;
  } catch (error) {
    console.error('Error caching media:', error);
    // Return original URL if caching fails
    return media.url.startsWith('http') ? media.url : `${baseUrl}${media.url}`;
  }
}

export async function cacheAllMedia(
  mediaItems: Media[],
  baseUrl: string
): Promise<void> {
  // Cache media in parallel, but limit concurrency to avoid overwhelming the system
  const BATCH_SIZE = 5;
  for (let i = 0; i < mediaItems.length; i += BATCH_SIZE) {
    const batch = mediaItems.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((media) => cacheMedia(media, baseUrl)));
  }
}

export async function cacheAllMediaWithProgress(
  mediaItems: Media[],
  baseUrl: string,
  onProgress?: (progress: number, currentItem: string, currentIndex: number, totalItems: number) => void
): Promise<void> {
  const totalItems = mediaItems.length;
  
  for (let i = 0; i < mediaItems.length; i++) {
    const media = mediaItems[i];
    const fileName = media.url.split('/').pop() || `media-${media.id}`;
    
    // Update progress
    const progress = Math.round(((i + 1) / totalItems) * 100);
    onProgress?.(progress, fileName, i, totalItems);
    
    // Cache the media (this will check cache first)
    await cacheMedia(media, baseUrl);
  }
  
  // Ensure progress is 100%
  onProgress?.(100, '', totalItems - 1, totalItems);
}

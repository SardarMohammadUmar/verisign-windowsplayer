import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { PairingScreen } from './components/PairingScreen';
import { LayoutPlayer } from './components/LayoutPlayer';
import { PlaylistPlayer } from './components/PlaylistPlayer';
import { NoMediaScreen } from './components/NoMediaScreen';
import { LoadingScreen } from './components/LoadingScreen';
// getScreenCode imported dynamically
import {
  initializeFirebase,
  createScreenInFirebase,
  listenToScreenChanges,
  updateScreenOnlineStatus,
  updateScreenConnected,
  updateScreenLastActive,
  updateScreenClearCache,
  isScreenDataComplete,
  type ScreenListenEvent,
} from './services/firebase';
import { fetchScreenData, logError, ScreenNotFoundError } from './services/api';
import { initializeMediaCache, cacheAllMediaWithProgress } from './services/mediaCache';
import { filterPlayableDirectPlaylists } from './services/playlistSchedule';
import { clearApplicationCaches } from './services/appCacheClear';
import { collectCacheableMedia } from './utils/cmsMedia';
import type { CMSResponse, FirebaseScreen, Media } from './types';
import config from '../config.json';
import './App.css';

// Types are declared in individual files

function App() {
  const [screenCode, setScreenCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [cmsData, setCmsData] = useState<CMSResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCachingMedia, setIsCachingMedia] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [cacheCurrentItem, setCacheCurrentItem] = useState<string>('');
  const [userDataPath, setUserDataPath] = useState<string>('');
  const previousMediaIdsRef = useRef<string>(''); // Track media IDs for cache invalidation
  const clearCacheBusyRef = useRef(false);

  const [scheduleNow, setScheduleNow] = useState(() => new Date());

  useEffect(() => {
    if (!isConnected) return;
    const id = window.setInterval(() => setScheduleNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  const eligibleDirectPlaylists = useMemo(
    () => filterPlayableDirectPlaylists(cmsData?.playlists, scheduleNow),
    [cmsData?.playlists, scheduleNow]
  );

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        // Get user data path
        const path = await (window.electronAPI?.getUserDataPath() || Promise.resolve(''));
        setUserDataPath(path);
        
        // Initialize media cache (non-blocking)
        try {
          await initializeMediaCache();
        } catch (error) {
          console.warn('Media cache initialization failed:', error);
        }

        // Get or generate screen code
        const { getScreenCode } = await import('./utils/screenCode');
        const code = await getScreenCode();
        setScreenCode(code);

        // Initialize Firebase
        if (initializeFirebase()) {
          // Check if screen exists in Firebase
          const screenExists = await checkScreenExists(code);
          if (!screenExists) {
            await createScreenInFirebase(code);
          }
        }

        setIsLoading(false);
      } catch (error) {
        logError(error as Error, 'App initialization');
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Check if screen exists with expected registration payload.
  const checkScreenExists = async (code: string): Promise<boolean> => {
    try {
      const { getScreenData } = await import('./services/firebase');
      const data = await getScreenData(code);
      return isScreenDataComplete(data);
    } catch {
      return false;
    }
  };

  // Fetch CMS data
  const fetchCMSData = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      setIsCachingMedia(true);
      setCacheProgress(0);
      
      const data = await fetchScreenData(code);

      const allMedia: Media[] = collectCacheableMedia(data);
      
      // Generate media IDs string for comparison
      const mediaIds = allMedia.map(m => m.id).sort().join(',');
      const mediaChanged = previousMediaIdsRef.current !== mediaIds;
      
      if (mediaChanged) {
        console.log('Media changed, refreshing cache...');
        previousMediaIdsRef.current = mediaIds;
        
        // Cache all media with progress tracking
        if (allMedia.length > 0) {
          await cacheAllMediaWithProgress(
            allMedia,
            config.cmsApiBaseUrl.replace('/api', ''),
            (progress, currentItem, currentIndex, totalItems) => {
              setCacheProgress(progress);
              setCacheCurrentItem(currentItem || '');
            }
          );
        }
      } else {
        console.log('Media unchanged, using cached files');
      }
      
      setCmsData(data);
      setIsCachingMedia(false);
      setIsLoading(false);
    } catch (error) {
      if (error instanceof ScreenNotFoundError) {
        try {
          await updateScreenConnected(code, false);
        } catch (syncErr) {
          console.error('Could not set connected=false in Firebase:', syncErr);
        }
        setIsConnected(false);
        setCmsData(null);
        previousMediaIdsRef.current = '';
      }
      logError(error as Error, 'Fetch CMS data');
      setIsCachingMedia(false);
      setIsLoading(false);
    }
  }, []);

  // Track last update timestamp to detect changes
  const lastUpdateRef = useRef<number>(0);

  // Listen to Firebase changes
  useEffect(() => {
    if (!screenCode) return;

    const unsubscribe = listenToScreenChanges(screenCode, async (data: FirebaseScreen | null, event: ScreenListenEvent) => {
      if (event === 'listen_error') {
        return;
      }

      if (event === 'removed' || data === null) {
        console.log('Screen record removed from Firebase — returning to pairing');
        setIsConnected(false);
        setCmsData(null);
        previousMediaIdsRef.current = '';
        try {
          await createScreenInFirebase(screenCode);
        } catch (e) {
          logError(e as Error, 'Recreate screen after Firebase removal');
        }
        return;
      }

      if (data.clearCache === true && !clearCacheBusyRef.current) {
        clearCacheBusyRef.current = true;
        console.log('clearCache requested — wiping caches and reloading');
        try {
          await clearApplicationCaches();
          await updateScreenClearCache(screenCode, false);
        } catch (e) {
          logError(e as Error, 'clearCache handling');
        }
        window.location.reload();
        return;
      }

      console.log('Firebase data received:', { connected: data.connected, lastUpdated: data.lastUpdated });

      // Update online status (heartbeat)
      try {
        await updateScreenOnlineStatus(screenCode, true);
      } catch (error) {
        console.error('Error updating online status:', error);
      }

      // Check if connected status changed to true
      if (data.connected === true) {
        console.log('Screen connected! Fetching CMS data...');
        
        if (!isConnected) {
          // First time connection
          setIsConnected(true);
          lastUpdateRef.current = data.lastUpdated || Date.now();
          await fetchCMSData(screenCode);
        } else {
          // Already connected, check if lastUpdated changed
          const currentLastUpdated = data.lastUpdated || 0;
          if (currentLastUpdated !== lastUpdateRef.current) {
            console.log('lastUpdated changed, refreshing content...');
            lastUpdateRef.current = currentLastUpdated;
            await fetchCMSData(screenCode);
          }
        }
      } else if (data.connected === false && isConnected) {
        // Disconnected
        console.log('Screen disconnected');
        setIsConnected(false);
        setCmsData(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [screenCode, isConnected, fetchCMSData]);

  // Heartbeat - update online status every 30 seconds
  useEffect(() => {
    if (!screenCode) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        await updateScreenOnlineStatus(screenCode, true);
      } catch (error) {
        logError(error as Error, 'Heartbeat');
      }
    }, config.heartbeatInterval);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [screenCode]);

  // lastActive heartbeat for CMS activity (single field write, default every 60s)
  useEffect(() => {
    if (!screenCode) return;

    const intervalMs =
      typeof (config as { lastActiveIntervalMs?: number }).lastActiveIntervalMs === 'number'
        ? (config as { lastActiveIntervalMs: number }).lastActiveIntervalMs
        : 60_000;

    const tick = () => {
      void updateScreenLastActive(screenCode);
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [screenCode]);

  if (isLoading && !screenCode) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing player...</p>
      </div>
    );
  }

  // Show pairing screen only if not connected
  if (!isConnected) {
    return <PairingScreen screenCode={screenCode} />;
  }

  // Show loading screen while caching media
  if (isCachingMedia) {
    return (
      <LoadingScreen
        progress={cacheProgress}
        currentItem={cacheCurrentItem}
      />
    );
  }

  // Show no media screen if connected but no media assigned
  const hasLayout =
    cmsData?.layoutSelected && cmsData?.layout && cmsData.layout.sections.length > 0;
  const hasLayoutMedia =
    !!hasLayout &&
    cmsData!.layout!.sections.some((s) =>
      (s.playlists || []).some((p) => (p.media || []).length > 0)
    );
  const hasDirectMedia = eligibleDirectPlaylists.length > 0;
  const hasMedia = hasLayoutMedia || hasDirectMedia;

  if (!hasMedia) {
    return <NoMediaScreen screenCode={screenCode} />;
  }

  // Show layout player if layout is selected
  if (cmsData?.layoutSelected && cmsData?.layout) {
    return <LayoutPlayer layout={cmsData.layout} />;
  }

  // Direct screen playlists (schedule-aware list)
  if (hasDirectMedia) {
    return <PlaylistPlayer playlists={eligibleDirectPlaylists} />;
  }

  // Fallback to no media screen
  return <NoMediaScreen screenCode={screenCode} />;
}

export default App;


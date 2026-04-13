import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Layout } from '../types';
import { getCachedMediaPath, isMediaCached, cacheMedia } from '../services/mediaCache';
import { LoadingScreen } from './LoadingScreen';
import config from '../../config.json';
import {
  advancePlaybackIndices,
  shouldLoopVideoIntervalZero,
  sortedPlayablePlaylists,
} from '../utils/playbackAdvance';
import { centeredRotationTransform, isQuarterTurnRotation } from '../utils/mediaRotation';
import './LayoutPlayer.css';

interface LayoutPlayerProps {
  layout: Layout;
}

interface SectionPlayerProps {
  section: Layout['sections'][0];
  baseUrl: string;
}

const initialIndices = { playlistIndex: 0, mediaIndex: 0, cycle: 0 };

const SectionPlayer: React.FC<SectionPlayerProps> = ({ section, baseUrl }) => {
  const [indices, setIndices] = useState(initialIndices);
  const [mediaPath, setMediaPath] = useState<string>('');
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [mediaRotation, setMediaRotation] = useState<number>(0);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | HTMLIFrameElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoEndedHandlerRef = useRef<(() => void) | null>(null);
  const playlistsRef = useRef(section.playlists);

  const playlistsSorted = useMemo(
    () => sortedPlayablePlaylists(section.playlists),
    [section.playlists]
  );
  playlistsRef.current = playlistsSorted;

  const playlistKey = useMemo(
    () => playlistsSorted.map((p) => p.id).join(','),
    [playlistsSorted]
  );

  const currentPlaylist = playlistsSorted[indices.playlistIndex];
  const currentMedia = currentPlaylist?.media[indices.mediaIndex];

  useEffect(() => {
    setIndices(initialIndices);
  }, [playlistKey]);

  useEffect(() => {
    if (!playlistsSorted.length) return;
    setIndices((prev) => {
      const pls = playlistsSorted;
      if (prev.playlistIndex >= pls.length) {
        return { playlistIndex: 0, mediaIndex: 0, cycle: prev.cycle + 1 };
      }
      const n = pls[prev.playlistIndex].media.length;
      if (prev.mediaIndex >= n) {
        return { playlistIndex: prev.playlistIndex, mediaIndex: 0, cycle: prev.cycle + 1 };
      }
      return prev;
    });
  }, [playlistsSorted]);

  const moveToNext = useCallback(() => {
    setIndices((prev) => advancePlaybackIndices(prev, playlistsRef.current));
  }, []);

  useEffect(() => {
    const loadAndCacheMedia = async () => {
      if (!currentMedia) {
        setIsLoadingMedia(false);
        setMediaPath('');
        return;
      }

      setIsLoadingMedia(true);
      setMediaRotation(currentMedia.rotation || 0);

      try {
        if (currentMedia.type === 'html') {
          const path = currentMedia.url.startsWith('http')
            ? currentMedia.url
            : `${baseUrl}${currentMedia.url}`;
          setMediaPath(path);
          setIsLoadingMedia(false);
        } else {
          const cached = await isMediaCached(currentMedia);

          if (cached) {
            setMediaPath(`file://${getCachedMediaPath(currentMedia)}`);
            setIsLoadingMedia(false);
          } else {
            const path = await cacheMedia(currentMedia, baseUrl);
            setMediaPath(path.startsWith('file://') ? path : path);
            setIsLoadingMedia(false);
          }
        }
      } catch (error) {
        console.error('Error loading media:', error);
        const fallbackPath = currentMedia.url.startsWith('http')
          ? currentMedia.url
          : `${baseUrl}${currentMedia.url}`;
        setMediaPath(fallbackPath);
        setIsLoadingMedia(false);
      }
    };

    void loadAndCacheMedia();
  }, [currentMedia, baseUrl]);

  useEffect(() => {
    if (!currentMedia || isLoadingMedia || !mediaPath) return;

    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    if (videoEndedHandlerRef.current && mediaRef.current && currentMedia.type === 'video') {
      const video = mediaRef.current as HTMLVideoElement;
      video.removeEventListener('ended', videoEndedHandlerRef.current);
      videoEndedHandlerRef.current = null;
    }

    const loopVideoForever =
      currentMedia.type === 'video' &&
      currentMedia.interval === 0 &&
      shouldLoopVideoIntervalZero(playlistsRef.current);

    let moved = false;
    const safeMoveToNext = () => {
      if (moved) return;
      moved = true;
      moveToNext();
    };

    const setupPlayback = () => {
      if (currentMedia.type === 'video' && mediaRef.current) {
        const video = mediaRef.current as HTMLVideoElement;

        const handleEnded = () => {
          safeMoveToNext();
        };

        videoEndedHandlerRef.current = handleEnded;
        video.addEventListener('ended', handleEnded);

        if (loopVideoForever) {
          video.loop = true;
        } else {
          video.loop = false;
        }

        if (currentMedia.interval > 0) {
          intervalRef.current = setTimeout(() => {
            video.pause();
            try {
              video.currentTime = 0;
            } catch {
              // Ignore seek failures
            }
            safeMoveToNext();
          }, currentMedia.interval * 1000);
        }
      } else if (currentMedia.type === 'image' || currentMedia.type === 'html') {
        const interval = currentMedia.interval > 0 ? currentMedia.interval * 1000 : 5000;

        intervalRef.current = setTimeout(() => {
          safeMoveToNext();
        }, interval);
      }
    };

    const timer = setTimeout(() => {
      setupPlayback();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      if (videoEndedHandlerRef.current && mediaRef.current && currentMedia.type === 'video') {
        const video = mediaRef.current as HTMLVideoElement;
        video.removeEventListener('ended', videoEndedHandlerRef.current);
        videoEndedHandlerRef.current = null;
      }
    };
  }, [
    currentMedia,
    indices.playlistIndex,
    indices.mediaIndex,
    indices.cycle,
    isLoadingMedia,
    mediaPath,
    moveToNext,
  ]);

  if (!currentMedia || isLoadingMedia || !mediaPath) {
    return (
      <div
        className="section-player"
        style={{
          width: `${section.width_px}px`,
          height: `${section.height_px}px`,
          marginTop: `${section.margin_top_px}px`,
          marginLeft: `${section.margin_left_px}px`,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
        }}
      >
        <div className="section-loading-spinner"></div>
      </div>
    );
  }

  const sectionStyle = {
    width: `${section.width_px}px`,
    height: `${section.height_px}px`,
    marginTop: `${section.margin_top_px}px`,
    marginLeft: `${section.margin_left_px}px`,
    position: 'absolute' as const,
    overflow: 'hidden' as const,
    ['--section-w' as string]: `${section.width_px}px`,
    ['--section-h' as string]: `${section.height_px}px`,
  } as React.CSSProperties;

  const quarterTurn = isQuarterTurnRotation(mediaRotation);

  const rotationStyle: React.CSSProperties = quarterTurn
    ? {
        transform: centeredRotationTransform(mediaRotation),
        transformOrigin: 'center center',
      }
    : mediaRotation !== 0
      ? {
          transform: `rotate(${mediaRotation}deg)`,
          transformOrigin: 'center center',
          objectFit: 'contain',
        }
      : { objectFit: 'contain' };

  const mediaClassName = quarterTurn
    ? 'section-media section-media--quarter'
    : 'section-media';

  const loopVideoForever =
    currentMedia.type === 'video' &&
    currentMedia.interval === 0 &&
    shouldLoopVideoIntervalZero(playlistsSorted);

  return (
    <div className="section-player" style={sectionStyle}>
      {currentMedia.type === 'image' && (
        <img
          key={`${indices.playlistIndex}-${indices.mediaIndex}-${indices.cycle}`}
          ref={mediaRef as React.RefObject<HTMLImageElement>}
          src={mediaPath}
          alt={`Media ${currentMedia.id}`}
          className={mediaClassName}
          style={rotationStyle}
          onError={(e) => {
            console.error('Image load error:', currentMedia.url);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {currentMedia.type === 'video' && (
        <video
          key={`${indices.playlistIndex}-${indices.mediaIndex}-${indices.cycle}`}
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={mediaPath}
          className={mediaClassName}
          autoPlay
          muted
          loop={loopVideoForever}
          playsInline
          style={rotationStyle}
          onError={() => {
            console.error('Video load error:', currentMedia.url);
          }}
          onLoadedData={() => {
            if (mediaRef.current) {
              (mediaRef.current as HTMLVideoElement).play().catch(console.error);
            }
          }}
        />
      )}
      {currentMedia.type === 'html' && (
        <iframe
          key={`${indices.playlistIndex}-${indices.mediaIndex}-${indices.cycle}`}
          ref={mediaRef as React.RefObject<HTMLIFrameElement>}
          src={mediaPath}
          className={mediaClassName}
          frameBorder="0"
          style={
            quarterTurn
              ? { border: 'none', ...rotationStyle }
              : { width: '100%', height: '100%', border: 'none', ...rotationStyle }
          }
          onError={() => {
            console.error('HTML load error:', currentMedia.url);
          }}
        />
      )}
    </div>
  );
};

export const LayoutPlayer: React.FC<LayoutPlayerProps> = ({ layout }) => {
  const baseUrl = config.cmsApiBaseUrl.replace('/api', '');
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const sectionsSorted = useMemo(() => {
    return [...layout.sections].sort((a, b) => {
      const oa = a.order ?? 0;
      const ob = b.order ?? 0;
      if (oa !== ob) return oa - ob;
      return a.id - b.id;
    });
  }, [layout.sections]);

  const layoutW = Math.max(1, layout.width);
  const layoutH = Math.max(1, layout.height);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const compute = () => {
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      if (vw <= 0 || vh <= 0) return;
      const s = Math.min(vw / layoutW, vh / layoutH);
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layoutW, layoutH]);

  return (
    <div className="layout-player-viewport" ref={viewportRef}>
      <div
        className="layout-player-scale-slot"
        style={{
          width: layoutW * scale,
          height: layoutH * scale,
        }}
      >
        <div
          className="layout-player"
          style={{
            width: layoutW,
            height: layoutH,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {sectionsSorted.map((section) => (
            <SectionPlayer key={section.id} section={section} baseUrl={baseUrl} />
          ))}
        </div>
      </div>
    </div>
  );
};

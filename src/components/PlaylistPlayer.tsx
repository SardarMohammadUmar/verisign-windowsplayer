import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Playlist } from '../types';
import { getCachedMediaPath, isMediaCached, cacheMedia } from '../services/mediaCache';
import { LoadingScreen } from './LoadingScreen';
import config from '../../config.json';
import {
  advancePlaybackIndices,
  shouldLoopVideoIntervalZero,
  sortedPlayablePlaylists,
} from '../utils/playbackAdvance';
import { centeredRotationTransform, isQuarterTurnRotation } from '../utils/mediaRotation';
import './PlaylistPlayer.css';

interface PlaylistPlayerProps {
  playlists: Playlist[];
}

const initialIndices = { playlistIndex: 0, mediaIndex: 0, cycle: 0 };

export const PlaylistPlayer: React.FC<PlaylistPlayerProps> = ({ playlists }) => {
  const [indices, setIndices] = useState(initialIndices);
  const [mediaPath, setMediaPath] = useState<string>('');
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [mediaRotation, setMediaRotation] = useState<number>(0);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | HTMLIFrameElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoEndedHandlerRef = useRef<(() => void) | null>(null);
  const playlistsRef = useRef(playlists);

  const playlistsSorted = useMemo(() => sortedPlayablePlaylists(playlists), [playlists]);
  playlistsRef.current = playlistsSorted;

  const playlistKey = useMemo(
    () => playlistsSorted.map((p) => p.id).join(','),
    [playlistsSorted]
  );

  const currentPlaylist = playlistsSorted[indices.playlistIndex];
  const currentMedia = currentPlaylist?.media[indices.mediaIndex];
  const baseUrl = config.cmsApiBaseUrl.replace('/api', '');

  const hasMedia = playlistsSorted.length > 0;
  const totalMediaCount = playlistsSorted.reduce((sum, p) => sum + (p.media?.length || 0), 0);

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

  if (!hasMedia || totalMediaCount === 0) {
    return null;
  }

  if (isLoadingMedia || !mediaPath) {
    return <LoadingScreen />;
  }

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
    ? 'playlist-media playlist-media--quarter'
    : 'playlist-media';

  const loopVideoForever =
    currentMedia.type === 'video' &&
    currentMedia.interval === 0 &&
    shouldLoopVideoIntervalZero(playlistsSorted);

  return (
    <div className="playlist-player">
      {currentMedia.type === 'image' && (
        <img
          key={`${indices.playlistIndex}-${indices.mediaIndex}-${indices.cycle}`}
          ref={mediaRef as React.RefObject<HTMLImageElement>}
          src={mediaPath}
          alt={`Media ${currentMedia.id}`}
          className={mediaClassName}
          style={rotationStyle}
          onError={() => {
            console.error('Image load error:', currentMedia.url);
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
              ? { width: '100vh', height: '100vw', border: 'none', ...rotationStyle }
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

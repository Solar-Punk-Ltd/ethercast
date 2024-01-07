import { useEffect, useRef } from 'react';

import { attach } from '../../libs/player';

import { StartOverlay } from './StartOverlay';

import './VideoPlayer.scss';

interface VideoPlayerProps {
  options?: any;
}

export function VideoPlayer({ options }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>();

  useEffect(() => {
    // Ensure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      playerRef.current = attach();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current = undefined;
      }
    };
  }, [options]);

  return (
    <div className="video-container">
      <StartOverlay onStart={() => ({})} />
      <video className="video" ref={videoRef}></video>
    </div>
  );
}

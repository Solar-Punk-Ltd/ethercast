import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { attach, detach, pause, play, restart } from '../../libs/player';

import { Controls } from './Controls';
import { StartOverlay } from './StartOverlay';

import './VideoPlayer.scss';

interface VideoPlayerProps {
  options?: any;
}

export function VideoPlayer({ options }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [initClick, setInitClick] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      attach(videoRef.current);
    }

    return () => {
      detach();
    };
  }, []);

  const playStream = () => {
    play();
    setInitClick(true);
    setIsPlaying(true);
  };

  const pauseStream = () => {
    pause();
    setIsPlaying(false);
  };

  const onMouseEnterVideo = () => {
    setShowControls(true);
  };

  const onMouseLeaveVideo = () => {
    setShowControls(false);
  };

  return (
    <div className="video-container" onMouseEnter={onMouseEnterVideo} onMouseLeave={onMouseLeaveVideo}>
      {!initClick && <StartOverlay onStart={playStream} />}
      <video ref={videoRef} controlsList="nodownload"></video>
      <Controls
        onPlay={playStream}
        onPause={pauseStream}
        onRestart={restart}
        isStreamPlaying={isPlaying}
        className={clsx(showControls && initClick ? 'controls-visible' : 'controls-hidden')}
      />
    </div>
  );
}

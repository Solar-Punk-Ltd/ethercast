import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { WithAsyncErrorBoundary, WithErrorBoundary } from '../../hooks/WithErrorBoundary';
import { attach, detach, getApproxDuration, pause, play, restart, seek, setVolumeControl } from '../../libs/player';

import { Controls } from './Controls/Controls';
import { StartOverlay } from './StartOverlay/StartOverlay';

import './VideoPlayer.scss';

export function VideoPlayer() {
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
    <div className="video-player" onMouseEnter={onMouseEnterVideo} onMouseLeave={onMouseLeaveVideo}>
      {!initClick && <StartOverlay onStart={WithErrorBoundary(playStream)} />}
      <video ref={videoRef} controlsList="nodownload"></video>
      <Controls
        onPlay={WithErrorBoundary(playStream)}
        onPause={WithErrorBoundary(pauseStream)}
        onRestart={WithErrorBoundary(restart)}
        onSeek={WithErrorBoundary(seek)}
        getDuration={WithAsyncErrorBoundary(getApproxDuration)}
        setVolumeControl={WithErrorBoundary(setVolumeControl)}
        mediaElement={videoRef.current}
        isStreamPlaying={isPlaying}
        className={clsx(showControls && initClick ? 'controls-visible' : 'controls-hidden')}
      />
    </div>
  );
}

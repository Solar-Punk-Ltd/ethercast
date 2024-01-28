import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { attach, detach, getApproxDuration, pause, play, restart, seek, setVolumeControl } from '../../libs/player';

import { Controls } from './Controls';
import { StartOverlay } from './StartOverlay';

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
    <div className="video-container" onMouseEnter={onMouseEnterVideo} onMouseLeave={onMouseLeaveVideo}>
      {!initClick && <StartOverlay onStart={playStream} />}
      <video ref={videoRef} controlsList="nodownload"></video>
      <Controls
        onPlay={playStream}
        onPause={pauseStream}
        onRestart={restart}
        onSeek={seek}
        getDuration={getApproxDuration}
        setVolumeControl={setVolumeControl}
        mediaElement={videoRef.current}
        isStreamPlaying={isPlaying}
        className={clsx(showControls && initClick ? 'controls-visible' : 'controls-hidden')}
      />
    </div>
  );
}

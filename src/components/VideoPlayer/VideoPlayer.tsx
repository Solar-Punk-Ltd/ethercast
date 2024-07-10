import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { WithAsyncErrorBoundary, WithErrorBoundary } from '../../hooks/WithErrorBoundary';
import { attach, Controls as IControls, detach, EVENTS } from '../../libs/player';
import { remove0xPrefix } from '../../utils/common';

import { Controls } from './Controls/Controls';
import { LoadingOverlay } from './LoadingOverlay/LoadingOverlay';
import { StartOverlay } from './StartOverlay/StartOverlay';

import './VideoPlayer.scss';

interface VideoPlayerProps {
  topic: string;
  owner: string;
}

export function VideoPlayer({ topic, owner }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IControls | null>(null);

  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      const controls = attach({ media: videoRef.current, address: remove0xPrefix(owner), topic });
      controlsRef.current = controls;

      controls.on(EVENTS.LOADING_PLAYING_CHANGE, (isLoading: boolean) => setLoading(isLoading));
      controls.on(EVENTS.IS_PLAYING_CHANGE, (isPlaying: boolean) => setIsPlaying(isPlaying));
    }

    return () => {
      detach(); // subsribes off for the controls as well
    };
  }, [owner, topic]);

  const handleContinueClick = WithErrorBoundary(() => {
    controlsRef.current?.continueStream();
  });

  const handlePlayClick = WithAsyncErrorBoundary(async () => {
    setShowStartOverlay(false);
    await controlsRef.current?.play();
  });

  const handlePauseClick = WithErrorBoundary(() => {
    controlsRef.current?.pause();
  });

  const handleRestartClick = WithAsyncErrorBoundary(async () => {
    controlsRef.current?.restart();
  });

  const handleSeekClick = WithAsyncErrorBoundary(async (index: number) => {
    controlsRef.current?.seek(index);
  });

  const handleSetVolumeControlClick = WithErrorBoundary((volumeControl: HTMLInputElement) => {
    controlsRef.current?.setVolumeControl(volumeControl);
  });

  const handleGetDuration = WithAsyncErrorBoundary(async () => {
    return await controlsRef.current?.getDuration();
  });

  const onMouseEnterVideo = () => {
    if (!showStartOverlay) {
      setShowControls(true);
    }
  };

  const onMouseLeaveVideo = () => {
    if (!showStartOverlay) {
      setShowControls(false);
    }
  };

  return (
    <div className="video-player" onMouseEnter={onMouseEnterVideo} onMouseLeave={onMouseLeaveVideo}>
      <video ref={videoRef} controlsList="nodownload"></video>
      {showStartOverlay && <StartOverlay handleStartClick={handlePlayClick} />}
      {loading && !showStartOverlay && <LoadingOverlay />}
      <Controls
        handlePlayClick={handleContinueClick}
        handlePauseClick={handlePauseClick}
        handleRestartClick={handleRestartClick}
        handleSeekClick={handleSeekClick}
        handleSetVolumeControlClick={handleSetVolumeControlClick}
        getDuration={handleGetDuration}
        mediaElement={videoRef.current}
        isPlaying={isPlaying}
        className={clsx(showControls && !loading ? 'controls-visible' : 'controls-hidden')}
      />
    </div>
  );
}

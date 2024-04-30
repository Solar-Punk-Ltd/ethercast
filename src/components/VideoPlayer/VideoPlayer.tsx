import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { WithAsyncErrorBoundary, WithErrorBoundary } from '../../hooks/WithErrorBoundary';
import { attach, detach, getApproxDuration, play, restart, seek, setVolumeControl } from '../../libs/player';
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
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      const onPlay = () => {
        setIsPlaying(true);
        setLoading(false);
      };
      const onPause = () => {
        setIsPlaying(false);
        setLoading(false);
      };
      attach({ media: videoRef.current, address: remove0xPrefix(owner), topic, onPlay, onPause, onEnd: onPause });
    }

    return () => {
      detach();
    };
  }, [owner, topic]);

  const handlePlayClick = async () => {
    setShowStartOverlay(false);
    play();
  };

  const handlePauseClick = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

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
      {showStartOverlay && <StartOverlay handleStartClick={WithAsyncErrorBoundary(handlePlayClick)} />}
      {loading && <LoadingOverlay />}
      <video ref={videoRef} controlsList="nodownload"></video>
      <Controls
        handlePlayClick={WithAsyncErrorBoundary(play)}
        handlePauseClick={WithErrorBoundary(handlePauseClick)}
        onRestart={WithErrorBoundary(restart)}
        onSeek={WithErrorBoundary(seek)}
        getDuration={WithAsyncErrorBoundary(getApproxDuration)}
        setVolumeControl={WithErrorBoundary(setVolumeControl)}
        mediaElement={videoRef.current}
        isPlaying={isPlaying}
        className={clsx(showControls && !loading ? 'controls-visible' : 'controls-hidden')}
      />
    </div>
  );
}

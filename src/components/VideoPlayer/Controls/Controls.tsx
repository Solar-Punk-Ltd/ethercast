import { useState } from 'react';
import clsx from 'clsx';

import pauseIcon from '../../../assets/icons/pause-fill.svg';
import playIcon from '../../../assets/icons/play-fill.svg';
import { VideoDuration } from '../../../libs/player';
import { Button, ButtonVariant } from '../../Button/Button';
import { LiveIndicator } from '../../LiveIndicator/LiveIndicator';

import { FullscreenControl } from './FullscreenControl/FullscreenControl';
import { ProgressBar } from './ProgressBar/ProgressBar';
import { VolumeControl } from './VolumeControl/VolumeControl';

import './Controls.scss';

interface ControlsProps {
  className?: string;
  isPlaying: boolean;
  mediaElement: HTMLVideoElement | null;
  handlePlayClick: () => void;
  handlePauseClick: () => void;
  onRestart: () => void;
  onSeek: (index: number) => void;
  getDuration: () => Promise<VideoDuration>;
  setVolumeControl: (element: HTMLInputElement) => void;
}

export function Controls({
  className,
  isPlaying,
  handlePlayClick,
  handlePauseClick,
  onRestart,
  onSeek,
  getDuration,
  setVolumeControl,
  mediaElement,
}: ControlsProps) {
  const [progress, setProgress] = useState<number>(100);

  const restart = () => {
    onRestart();
    setProgress(100);
  };

  return (
    <div className={clsx('controls', className)}>
      <div className="gradient-highlighter" />
      <div className="controls-container">
        <div className="progress-container">
          <ProgressBar
            onSeek={onSeek}
            getDuration={getDuration}
            progress={progress}
            onSetProgress={(value: number) => setProgress(value)}
          />
        </div>
        <div className="actions-container">
          <div className="left-actions">
            {isPlaying ? (
              <Button onClick={handlePauseClick} variant={ButtonVariant.icon}>
                <img alt="pause" src={pauseIcon}></img>
              </Button>
            ) : (
              <Button onClick={handlePlayClick} variant={ButtonVariant.icon}>
                <img alt="play" src={playIcon}></img>
              </Button>
            )}
            <VolumeControl initControl={setVolumeControl} />
            <LiveIndicator className="indicator" onClick={restart} />
          </div>
          <div className="right-actions">
            <FullscreenControl mediaElement={mediaElement} />
          </div>
        </div>
      </div>
    </div>
  );
}

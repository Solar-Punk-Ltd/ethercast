import clsx from 'clsx';

import pauseIcon from '../../../assets/icons/pause-fill.svg';
import playIcon from '../../../assets/icons/play-fill.svg';
import { VideoDuration } from '../../../libs/player';
import { Button, ButtonVariant } from '../../Button';
import { LiveIndicator } from '../../LiveIndicator';

import { FullscreenControl } from './FullscreenControl';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';

import './Controls.scss';

interface ControlsProps {
  className?: string;
  isStreamPlaying: boolean;
  mediaElement: HTMLVideoElement | null;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSeek: (index: number) => void;
  getDuration: () => Promise<VideoDuration>;
  setVolumeControl: (element: HTMLInputElement) => void;
}

export function Controls({
  className,
  isStreamPlaying,
  onPlay,
  onPause,
  onRestart,
  onSeek,
  getDuration,
  setVolumeControl,
  mediaElement,
}: ControlsProps) {
  return (
    <div className={clsx('controls', className)}>
      <div className="gradient-highlighter" />
      <div className="controls-container">
        <div className="progress-container">
          <ProgressBar onSeek={onSeek} getDuration={getDuration} />
        </div>
        <div className="actions-container">
          <div className="left-actions">
            {isStreamPlaying ? (
              <Button onClick={onPause} variant={ButtonVariant.icon}>
                <img alt="pause" src={pauseIcon}></img>
              </Button>
            ) : (
              <Button onClick={onPlay} variant={ButtonVariant.icon}>
                <img alt="play" src={playIcon}></img>
              </Button>
            )}
            <VolumeControl initControl={setVolumeControl} />
            <LiveIndicator className="indicator" onClick={onRestart} />
          </div>
          <div className="right-actions">
            <FullscreenControl mediaElement={mediaElement} />
          </div>
        </div>
      </div>
    </div>
  );
}

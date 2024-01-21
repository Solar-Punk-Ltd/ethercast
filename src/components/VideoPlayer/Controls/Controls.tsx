import clsx from 'clsx';

import pauseIcon from '../../../assets/icons/pause-fill.svg';
import playIcon from '../../../assets/icons/play-fill.svg';
import { Button, ButtonVariant } from '../../Button';
import { LiveIndicator } from '../../LiveIndicator';

import { FullscreenControl } from './FullscreenControl';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';

import './Controls.scss';

interface ControlsProps {
  className?: string;
  isStreamPlaying: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onRestart?: () => void;
}

export function Controls({ onPlay, onPause, onRestart, isStreamPlaying, className }: ControlsProps) {
  return (
    <div className={clsx('controls', className)}>
      <div className="gradient-highlighter" />
      <div className="controls-container">
        <div className="progress-container">
          <ProgressBar />
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
            <VolumeControl />
            <LiveIndicator className="indicator" onClick={onRestart} />
          </div>
          <div className="right-actions">
            <FullscreenControl />
          </div>
        </div>
      </div>
    </div>
  );
}

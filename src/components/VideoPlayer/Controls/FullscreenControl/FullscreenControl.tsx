import fullscreenIcon from '../../../../assets/icons/fullscreen.svg';
import { Button, ButtonVariant } from '../../../Button/Button';

import './FullscreenControl.scss';

interface FullscreenControlProps {
  mediaElement: HTMLVideoElement | null;
}

export function FullscreenControl({ mediaElement }: FullscreenControlProps) {
  const isFullscreen = () => document.fullscreenElement !== null;

  const toggleFullscreen = async () => {
    if (isFullscreen()) {
      await document.exitFullscreen();
      return;
    }
    if (mediaElement) {
      mediaElement.requestFullscreen();
    }
  };

  return (
    <Button onClick={toggleFullscreen} variant={ButtonVariant.icon}>
      <img alt="fullscreen" src={fullscreenIcon}></img>
    </Button>
  );
}

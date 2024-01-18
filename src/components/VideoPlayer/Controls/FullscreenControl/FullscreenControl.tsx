import fullscreenIcon from '../../../../assets/icons/fullscreen.svg';
import { getMediaElement } from '../../../../libs/player';
import { Button, ButtonVariant } from '../../../Button';

import './FullscreenControl.scss';

export function FullscreenControl() {
  const isFullscreen = () => document.fullscreenElement !== null;

  const toggleFullscreen = async () => {
    const mediaElement = getMediaElement();

    if (isFullscreen()) {
      await document.exitFullscreen();
      return;
    }

    mediaElement.requestFullscreen();
  };

  return (
    <Button onClick={toggleFullscreen} variant={ButtonVariant.icon}>
      <img alt="fullscreen" src={fullscreenIcon}></img>
    </Button>
  );
}

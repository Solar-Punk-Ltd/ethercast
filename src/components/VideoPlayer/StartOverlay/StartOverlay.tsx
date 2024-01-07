import playIcon from '../../../assets/icons/play-circle.svg';
import { Button } from '../../Button';

import './StartOverlay.scss';

interface StartOverlayProps {
  onStart: () => void;
}

export function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div className="start-overlay">
      <Button onClick={onStart}>
        <img alt="play" src={playIcon}></img>
      </Button>
    </div>
  );
}

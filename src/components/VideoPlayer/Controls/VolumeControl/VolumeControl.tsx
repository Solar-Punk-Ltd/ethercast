import React, { useEffect, useRef, useState } from 'react';

import volumeDownIcon from '../../../../assets/icons/volume-down-fill.svg';
import volumeMuteIcon from '../../../../assets/icons/volume-mute-fill.svg';
import volumeUpIcon from '../../../../assets/icons/volume-up-fill.svg';
import { Button, ButtonVariant } from '../../../Button/Button';

import './VolumeControl.scss';

interface VolumeControlProps {
  initControl: (element: HTMLInputElement) => void;
}

export function VolumeControl({ initControl }: VolumeControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    if (inputRef.current) {
      initControl(inputRef.current);
    }
  }, []);

  const getVolumeImgState = () => {
    if (volume === 0) {
      return volumeMuteIcon;
    }
    if (volume <= 50) {
      return volumeDownIcon;
    }
    return volumeUpIcon;
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(+event.target.value);

    const min = +event.target.min;
    const max = +event.target.max;
    const val = +event.target.value;
    const percentage = ((val - min) * 100) / (max - min);
    event.target.style.backgroundSize = percentage + '% 100%';
  };

  return (
    <div className="volume-control">
      <Button onClick={() => setVolume(0)} variant={ButtonVariant.icon}>
        <img alt="volume-down" src={getVolumeImgState()}></img>{' '}
      </Button>
      <input ref={inputRef} type="range" min="0" max="100" value={volume} onChange={handleVolumeChange} />
    </div>
  );
}

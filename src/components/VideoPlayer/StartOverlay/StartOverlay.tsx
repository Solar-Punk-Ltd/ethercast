import { useState } from 'react';

import playIcon from '../../../assets/icons/play-btn.svg';
import playFillIcon from '../../../assets/icons/play-btn-fill.svg';
import { Button, ButtonVariant } from '../../Button/Button';
import SmartDisplayOutlinedIcon from '@mui/icons-material/SmartDisplayOutlined';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';

import './StartOverlay.scss';

interface StartOverlayProps {
  onStart: () => void;
}

export function StartOverlay({ onStart }: StartOverlayProps) {
  const [isHovered, setIsHovered] = useState(false);

  const onMouseEnter = (_event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setIsHovered(true);
  };

  const onMouseLeave = (_event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setIsHovered(false);
  };

  return (
    <div className="start-overlay" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <Button onClick={onStart} variant={ButtonVariant.icon}>
        <SmartDisplayOutlinedIcon className="icon-default" sx={{ color: '#fa8904', fontSize: '80px' }} />
        <SmartDisplayIcon className="icon-hover" sx={{ color: '#fa8904', fontSize: '80px' }} />
        {/* <img alt="play" src={isHovered ? playFillIcon : playIcon}></img> */}
      </Button>
    </div>
  );
}

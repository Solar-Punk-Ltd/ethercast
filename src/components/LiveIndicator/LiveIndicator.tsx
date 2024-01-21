import { useEffect, useState } from 'react';
import clsx from 'clsx';

import './LiveIndicator.scss';

interface LiveIndicatorProps {
  className?: string;
  onClick?: () => void;
  live?: boolean;
}

export function LiveIndicator({ className, onClick, live = true }: LiveIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={clsx('live-indicator', className, live ? 'live' : '')} onClick={onClick}>
      <span className={clsx('dot', isVisible ? 'visible' : '')}></span>
      Live
    </div>
  );
}

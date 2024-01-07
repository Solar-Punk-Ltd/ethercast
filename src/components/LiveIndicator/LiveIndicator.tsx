import { useEffect, useState } from 'react';
import clsx from 'clsx';

import './LiveIndicator.scss';

interface LiveIndicatorProps {
  className?: string;
}

export function LiveIndicator({ className }: LiveIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={clsx('live-indicator', className)}>
      <span className={clsx('dot', isVisible ? 'visible' : '')}></span>
      LIVE
    </div>
  );
}

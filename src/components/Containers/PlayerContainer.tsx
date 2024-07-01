import { useEffect } from 'react';

import './PlayerContainer.scss';

interface PlayerContainerProps {
  children: React.ReactNode[];
}

export function PlayerContainer({ children }: PlayerContainerProps) {
  useEffect(() => {
    const outerDiv = document.getElementById('player-container')!;
    const innerDiv = document.getElementById('player-secondary-actions')!;

    const scrollHandler = () => {
      const bottomValue = `-${outerDiv.scrollTop}px`;
      innerDiv.style.bottom = bottomValue;
    };
    outerDiv.addEventListener('scroll', scrollHandler);

    return () => {
      outerDiv.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return (
    <div id="player-container">
      <div className="video-section">{children[0]}</div>
      <div id="player-secondary-actions">{children[1]}</div>
      <div className="list-section">{children[2]}</div>
    </div>
  );
}

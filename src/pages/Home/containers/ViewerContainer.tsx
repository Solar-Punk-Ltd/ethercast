import { useEffect } from 'react';

import './ViewContainer.scss';

interface ViewContainerProps {
  children: React.ReactNode[];
}

export function ViewContainer({ children }: ViewContainerProps) {
  useEffect(() => {
    const outerDiv = document.getElementById('view-container')!;
    const innerDiv = document.getElementById('view-secondary-actions')!;

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
    <div id="view-container">
      <div className="video-section">{children[0]}</div>
      <div id="view-secondary-actions">{children[1]}</div>
      <div className="list-section">{children[2]}</div>
    </div>
  );
}

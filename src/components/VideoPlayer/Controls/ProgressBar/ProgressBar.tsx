import React, { useEffect, useRef, useState } from 'react';

import './ProgressBar.scss';

type ProgressBarProps = {
  onSeek: (position: number) => void;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ onSeek }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const calculateProgress = (clientX: number) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const newProgress = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(newProgress, 100));
  };

  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.addEventListener('mousedown', (e) => {
        setProgress(calculateProgress(e.clientX));
      });
    }

    const mouseMoveHandler = (e: MouseEvent) => {
      setProgress(calculateProgress(e.clientX));
    };

    const mouseUpHandler = () => {
      setIsDragging(false);
      onSeek(progress / 100);
    };

    if (isDragging) {
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    }

    return () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [isDragging, onSeek]);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div ref={progressBarRef} className="progress-bar">
      <div className="filler" style={{ width: `${progress}%` }}></div>
      <div className="thumb" style={{ left: `${progress}%` }} onMouseDown={startDrag}></div>
    </div>
  );
};

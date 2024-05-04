import React, { useEffect, useRef, useState } from 'react';
import { ColorRing } from 'react-loader-spinner';

import { convertMillisecondsToTime } from '../../../../utils/date';
import { SeekData } from '../Controls';

import './ProgressBar.scss';

interface ProgressBarProps {
  seekData: SeekData;
  onSetProgress?: (value: number) => void;
  progress?: number;
}

export function ProgressBar({
  seekData: { loading, index, duration, seek },
  progress: externalProgress,
  onSetProgress,
}: ProgressBarProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [internalProgress, setInternalProgress] = useState<number>(100);
  const [cursorPercent, setCursorPercent] = useState<number>(0);

  const progress = externalProgress || internalProgress;
  const setProgress = onSetProgress || setInternalProgress;

  useEffect(() => {
    const calculateProgress = (clientX: number) => {
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const newProgress = ((clientX - rect.left) / rect.width) * 100;
      return Math.max(0, Math.min(newProgress, 100));
    };

    const mouseDownOnProgressBarHandler = async (e: MouseEvent) => {
      if (loading) return;
      const newProgress = calculateProgress(e.clientX);
      setProgress(newProgress);
      seek(Math.ceil(index! * (newProgress / 100)));
    };

    const mouseMoveOnProgressBarHandler = (e: MouseEvent) => {
      const progressBar = e.currentTarget as HTMLElement;
      const rect = progressBar.getBoundingClientRect();
      // Calculate the cursor's X position relative to the progress bar
      const x = e.pageX - rect.left - window.scrollX;
      // Set the marker's position
      if (markerRef.current) {
        markerRef.current.style.left = x + 'px';
      }
      // For timer calculation
      setCursorPercent((x / rect.width) * 100);
    };

    const mouseMoveHandler = (e: MouseEvent) => {
      if (loading) return;
      setProgress(calculateProgress(e.clientX));
    };

    const mouseUpHandler = () => {
      setIsDragging(false);
    };

    if (progressBarRef.current) {
      progressBarRef.current.addEventListener('mousedown', mouseDownOnProgressBarHandler);
      progressBarRef.current.addEventListener('mousemove', mouseMoveOnProgressBarHandler);
    }
    if (isDragging) {
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    }

    return () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      if (progressBarRef.current) {
        progressBarRef.current.removeEventListener('mousedown', mouseDownOnProgressBarHandler);
        progressBarRef.current.removeEventListener('mousemove', mouseMoveOnProgressBarHandler);
      }
    };
  }, [isDragging, index, loading]);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (loading) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const calculateTimeAtCursor = () => {
    const msAtCursor = (duration * cursorPercent) / 100;
    return convertMillisecondsToTime(msAtCursor);
  };

  return (
    <div ref={progressBarRef} className="progress-bar">
      <div ref={markerRef} className="marker">
        <div className="marker-info-container">
          {loading ? (
            <ColorRing
              visible
              height={36}
              width={36}
              ariaLabel="color-ring-loading"
              wrapperStyle={{}}
              wrapperClass="loader"
            />
          ) : (
            <p>{calculateTimeAtCursor()}</p>
          )}
        </div>
      </div>
      <div className="filler" style={{ width: `${progress}%` }}></div>
      <div className="thumb" style={{ left: `${progress}%` }} onMouseDown={startDrag}></div>
    </div>
  );
}

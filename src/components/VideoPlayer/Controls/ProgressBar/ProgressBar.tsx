import React, { useCallback, useEffect, useRef, useState } from 'react';

import { getApproxDuration, seek } from '../../../../libs/player';
import { debounce } from '../../../../utils/debounce';
import { convertMillisecondsToTime } from '../../../../utils/formatters';

import './ProgressBar.scss';

export function ProgressBar() {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [cursorPercent, setCursorPercent] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0); // [ms]
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const calculateProgress = (clientX: number) => {
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const newProgress = ((clientX - rect.left) / rect.width) * 100;
      return Math.max(0, Math.min(newProgress, 100));
    };

    // const mouseUpOnProgressBarHandler = (e: MouseEvent) => {
    //   const progress = calculateProgress(e.clientX);
    //   seek(Math.ceil(index! * (progress / 100)));
    // };

    const mouseDownOnProgressBarHandler = (e: MouseEvent) => {
      const progress = calculateProgress(e.clientX);
      setProgress(progress);
      seek(Math.ceil(index! * (progress / 100)));
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
      setProgress(calculateProgress(e.clientX));
    };

    const mouseUpHandler = () => {
      setIsDragging(false);
    };

    if (progressBarRef.current) {
      // progressBarRef.current.addEventListener('mouseup', mouseUpOnProgressBarHandler);
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
        // progressBarRef.current.addEventListener('mouseup', mouseUpOnProgressBarHandler);
        progressBarRef.current.removeEventListener('mousedown', mouseDownOnProgressBarHandler);
        progressBarRef.current.removeEventListener('mousemove', mouseMoveOnProgressBarHandler);
      }
    };
  }, [isDragging, index]);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onMouseEnterToProgressBar = useCallback(
    debounce(async () => {
      const { duration, index } = await getApproxDuration();
      setDuration(duration);
      setIndex(index);
    }, 500),
    [],
  );

  const calculateTimeAtCursor = () => {
    const msAtCursor = (duration * cursorPercent) / 100;
    return convertMillisecondsToTime(msAtCursor);
  };

  return (
    <div ref={progressBarRef} className="progress-bar" onMouseEnter={onMouseEnterToProgressBar}>
      <div ref={markerRef} className="marker">
        <p>{calculateTimeAtCursor()}</p>
      </div>
      <div className="filler" style={{ width: `${progress}%` }}></div>
      <div className="thumb" style={{ left: `${progress}%` }} onMouseDown={startDrag}></div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

import { attach, play } from '../../libs/player';

import { StartOverlay } from './StartOverlay';

import './VideoPlayer.scss';

interface VideoPlayerProps {
  options?: any;
}

export function VideoPlayer({ options }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [initClick, setInitClick] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      attach(videoRef.current);
      /*       setInterval(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 2;
        }
        console.log(videoRef.current?.currentTime);
      }, 1000); */
    }
  }, []);

  const playStream = () => {
    if (videoRef.current) {
      play();
      setInitClick(true);
    }
  };

  const fileChange = (e: any) => {
    const file = e.target.files[0];
    const fileURL = URL.createObjectURL(file);
    const video = document.querySelector('video');
    if (video) {
      console.log('asd');
      video.src = fileURL;
    }
  };

  return (
    <div className="video-container">
      {!initClick && <StartOverlay onStart={playStream} />}
      <video className="video" ref={videoRef} controls></video>
    </div>
  );
}

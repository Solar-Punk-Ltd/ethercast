import { useMemo } from 'react';

import { VideoPlayer } from '../components/VideoPlayer';
import { useStamp } from '../hooks/useStamp';

import './Home.scss';

export function Home() {
  const { stamp } = useStamp();

  /*   const play = async () => {
    const video = document.querySelector('#video')! as HTMLVideoElement;
    const player = new Player();
    await player.attach(stream.playlistUrl!, video);
    player.play();
  }; */

  const videoOptions = {
    autoplay: true,
    controls: true,
  };

  return (
    <div className="home">
      <VideoPlayer options={videoOptions} />
    </div>
  );
}

import { useMemo } from 'react';

import { useStamp } from '../hooks/useStamp';
import { Player } from '../libs/player';
import { Stream } from '../libs/stream';

import './Home.scss';

function Home() {
  const { stamp } = useStamp();

  const stream = useMemo(() => new Stream(), []);

  const play = async () => {
    const video = document.querySelector('#video')! as HTMLVideoElement;
    const player = new Player();
    await player.attach(stream.playlistUrl!, video);
    player.play();
  };

  return (
    <div className="home">
      <h1>Swarm streaming</h1>
      <div className="actions">
        <button type="button" onClick={() => stream.start(stamp())}>
          Stream
        </button>
        <button type="button" onClick={stream.stop}>
          Stop stream
        </button>
        <button type="button" onClick={play}>
          Play
        </button>
      </div>

      <video
        id="video"
        controls
        style={{
          marginTop: 21,
        }}
      />
    </div>
  );
}

export default Home;

import React, { useCallback, useMemo } from 'react';
import Hls from 'hls.js';

import './Home.scss';
import { useStamp } from '../hooks/useStamp';
import { Stream } from '../libs/stream';

function Home() {
  const { stamp } = useStamp();

  const stream = useMemo(() => new Stream(), []);

  const play = useCallback(async () => {
    if (Hls.isSupported()) {
      const video = document.getElementById('video') as HTMLMediaElement;
      const hls = new Hls({ debug: true });

      hls.on(Hls.Events.MEDIA_ATTACHED, function () {
        console.log('video and hls.js are now bound together !');
      });

      hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
        console.log('manifest loaded, found');
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error(event);
        console.error(data);
        console.error('ERROR!!!!!');
      });
      /*    hls.loadSource(
        'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
      ); */
      hls.loadSource(stream.playlistUrl);
      hls.attachMedia(video);
      console.log(stream.playlistUrl);
      // video.play();
    }
  }, []);

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

      <video id="video" controls />
    </div>
  );
}

export default Home;

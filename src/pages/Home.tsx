import React, { useEffect, useState } from 'react';
import { BatchId } from '@ethersphere/bee-js';
import Hls from 'hls.js';

import './Home.scss';
import { getStamp } from '../libs/stamp';
import { getPlaylistUrl, stream } from '../libs/stream';

function Home() {
  const [stamp, setStamp] = useState<string | BatchId>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    getStamp()
      .then((stmp) => setStamp(stmp))
      .catch((error) => console.error('Stamp error:', error));
  }, []);

  const startStream = async () => {
    await stream(stamp);
  };

  const play = async () => {
    if (Hls.isSupported()) {
      const video = document.getElementById('video') as HTMLMediaElement;
      const hls = new Hls({ debug: true });

      hls.on(Hls.Events.MEDIA_ATTACHED, function () {
        console.log('video and hls.js are now bound together !');
      });

      hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
        console.log('manifest loaded, found');
      });

      // const playlistSrc = getPlaylistUrl();
      const src = 'https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8';

      hls.loadSource(src);
      hls.attachMedia(video);
    }
  };

  return (
    <div className="home">
      <h1>Swarm streaming</h1>
      <div className="actions">
        <button type="button" onClick={startStream}>
          Stream
        </button>
        <button type="button" onClick={play}>
          Play
        </button>
      </div>

      <video id="video" controls preload="auto" />
    </div>
  );
}

export default Home;

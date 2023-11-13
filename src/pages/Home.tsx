import React, { useCallback, useMemo, useState } from 'react';
import { Reference as BeeReference } from '@ethersphere/bee-js';
import { Reference as MantarayReference } from 'mantaray-js';
import dashjs from 'dashjs';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';

import './Home.scss';
import { useStamp } from '../hooks/useStamp';
import { Stream } from '../libs/stream';
import { getStamp } from '../libs/stamp';
import { getBee } from '../libs/bee';
import { bytesToHexString, hexStringToBytes, stringToBytes } from '../utils/formatters';

const StyledDropzone = styled.div`
  display: flex;
  justify-content: center;
  cursor: pointer;
  color: white;
  border: 1px solid white;
  width: 500px;
  padding: 4px 16px;
  border-radius: 4px;
  margin-top: 40px;
`;

function Home() {
  const { stamp } = useStamp();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);

  const stream = useMemo(() => new Stream(), []);

  const play = useCallback(async () => {
    const video = document.getElementById('video') as HTMLMediaElement;
    // console.log(stream.playlistUrl);
    const src = `http://localhost:1633/bzz/3853d9987ea81b63f1873b1d50c0a7f2f2c374064e1a3c9ba08d0fe0fdab7982/manifest.mpd`;
    const player = dashjs.MediaPlayer().create();
    player.initialize(video, src, true);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setLoading(true);

    try {
      const bee = getBee();
      // do not care about multi select just grab the first one
      const file = acceptedFiles[0];
      const stamp = await getStamp();

      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const { reference } = await bee.uploadData(stamp, data);
      stream.mantaray.addFork(stringToBytes(file.name), hexStringToBytes(reference) as MantarayReference, {
        'Content-Type': file.name.includes('mpd') ? 'application/dash+xml' : file.type,
        Filename: file.name,
      });
      console.log(file);
      const savedMantaray = await stream.mantaray.save(stream.createSaver(stamp));

      await stream.initFeedWriter(stamp);
      await stream.feedWriter.upload(stamp, bytesToHexString(savedMantaray) as BeeReference);

      console.log(`http://localhost:1633/bzz/${stream.feedManifest.reference}/${file.name}`);
    } catch (error) {
      setError(error as any);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

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
          marginTop: 20,
        }}
      />

      <StyledDropzone {...getRootProps()}>
        <input {...getInputProps({ disabled: true })} />
        <p>Drag n drop a file here, or click to select file</p>
      </StyledDropzone>
    </div>
  );
}

export default Home;

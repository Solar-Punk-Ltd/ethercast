import { useEffect, useState } from 'react';

import { Button } from '../components/Button/Button';
import { Container } from '../components/Container';
import { LiveIndicator } from '../components/LiveIndicator';
import { TextInput } from '../components/TextInput';
import { useStamp } from '../hooks/useStamp';
import { isStreamOngoing, startStream, stopStream } from '../libs/stream';

import './Stream.scss';

export function Stream() {
  const { stamp } = useStamp();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    setIsLive(isStreamOngoing());
  }, []);

  const start = () => {
    startStream(stamp());
    setIsLive(true);
  };

  const stop = () => {
    stopStream();
    setIsLive(false);
  };

  return (
    <div className="stream">
      <Container className="stream-form">
        {isLive ? (
          <>
            <LiveIndicator className="indicator" />
            <Button onClick={() => stop()}>Stop stream</Button>
          </>
        ) : (
          <>
            <p>Link your wallet to auto populate this field</p>
            <TextInput placeholder="Wallet address" />
            <p>This is how others will find your stream</p>
            <TextInput placeholder="Stream topic" />
            <p>Please provide a valid stamp</p>
            <TextInput placeholder="Stamp" />
            <Button onClick={start}>Start stream</Button>
          </>
        )}
      </Container>
    </div>
  );
}

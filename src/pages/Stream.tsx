import { useEffect, useState } from 'react';
import { BatchId, Utils } from '@ethersphere/bee-js';
import { useEthers } from '@usedapp/core';
import { ethers } from 'ethers';
import { produce } from 'immer';

import { Button } from '../components/Button/Button';
import { Container } from '../components/Container';
import { LiveIndicator } from '../components/LiveIndicator';
import { TextInput } from '../components/TextInput';
import { useStamp } from '../hooks/useStamp';
import { isStreamOngoing, startStream, stopStream } from '../libs/stream';

import './Stream.scss';

interface StreamForm {
  wallet: string;
  topic: string;
  stamp: string;
}

export function Stream() {
  const { account, library } = useEthers();
  const { stamp } = useStamp();
  const [isLive, setIsLive] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    wallet: '',
    topic: '',
    stamp: '',
  });

  useEffect(() => {
    setIsLive(isStreamOngoing());
  }, []);

  const start = async () => {
    if (!library) return;
    const PRIVATE_KEY = '41794f971474641445c149425519dc7af14047012658d5ac557300cd644b6e0c';
    // const signer = await Utils.makeEthereumWalletSigner(window.ethereum);

    startStream(PRIVATE_KEY, form.topic, form.stamp as BatchId);
    setIsLive(true);
  };

  const stop = () => {
    stopStream();
    setIsLive(false);
  };

  const onFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextState = produce(form, (draft) => {
      draft[event.target.name] = event.target.value;
    });
    setForm(nextState);
  };

  return (
    <div className="stream">
      <Container className="stream-form">
        {isLive ? (
          <>
            <LiveIndicator className="indicator" />
            <p>Account: {account}</p>
            <p>Topic: {form.topic}</p>
            <Button onClick={() => stop()}>Stop stream</Button>
          </>
        ) : (
          <>
            <p>Link your wallet to auto populate this field</p>
            <TextInput
              placeholder="Wallet address"
              value={form.wallet || account || ''}
              name="wallet"
              onChange={onFormChange}
            />
            <p>This is how others will find your stream</p>
            <TextInput placeholder="Stream topic" value={form.topic} name="topic" onChange={onFormChange} />
            <p>Please provide a valid stamp</p>
            <TextInput placeholder="Stamp" value={form.stamp} name="stamp" onChange={onFormChange} />
            <Button onClick={start}>Start stream</Button>
          </>
        )}
      </Container>
    </div>
  );
}

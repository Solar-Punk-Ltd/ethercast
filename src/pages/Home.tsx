import { useState } from 'react';
import { useEthers } from '@usedapp/core';
import { produce } from 'immer';

import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { TextInput } from '../components/TextInput';
import { VideoPlayer } from '../components/VideoPlayer';
import { setFeedReader } from '../libs/player';

import './Home.scss';

export function Home() {
  const { account } = useEthers();
  const [showPlayer, setShowPlayer] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    wallet: '',
    topic: '',
  });

  const onFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextState = produce(form, (draft) => {
      draft[event.target.name] = event.target.value;
    });
    setForm(nextState);
  };

  const find = () => {
    const reader = setFeedReader(form.topic, form.wallet);
    setShowPlayer(true);
  };

  return (
    <div className="home">
      {showPlayer ? (
        <VideoPlayer />
      ) : (
        <Container className="stream-form">
          <p>Link your wallet to auto populate this field</p>
          <TextInput
            placeholder="Wallet address"
            value={form.wallet || account || ''}
            name="wallet"
            onChange={onFormChange}
          />
          <p>This is how others will find your stream</p>
          <TextInput placeholder="Stream topic" value={form.topic} name="topic" onChange={onFormChange} />
          <Button onClick={find}>Find stream</Button>
        </Container>
      )}
    </div>
  );
}

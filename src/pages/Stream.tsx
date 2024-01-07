import { Button } from '../components/Button/Button';
import { Container } from '../components/Container';
import { TextInput } from '../components/TextInput';

import './Stream.scss';

export function Stream() {
  return (
    <div className="stream">
      <Container className="stream-form">
        <p>Link your wallet to auto populate this field</p>
        <TextInput placeholder="Wallet address" />
        <p>This is how others will find your stream</p>
        <TextInput placeholder="Stream topic" />
        <p>Please provide a valid stamp</p>
        <TextInput placeholder="Stamp" />
        <Button>Start stream</Button>
      </Container>
    </div>
  );
}

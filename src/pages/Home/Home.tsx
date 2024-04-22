import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '../../components/Button/Button';
import { Chat } from '../../components/Chat/Chat';
import { FormContainer } from '../../components/FormContainer/FormContainer';
import { JoinButton } from '../../components/JoinButton/JoinButton';
import { ControllerTextInput } from '../../components/TextInput/ControllerTextInput';
import { VideoList } from '../../components/VideoList/VideoList';
import { VideoPlayer } from '../../components/VideoPlayer/VideoPlayer';
import { WithAsyncErrorBoundary } from '../../hooks/WithErrorBoundary';
import { setFeedReader, setPlayerOptions } from '../../libs/player';
import { remove0xPrefix } from '../../utils/common';
import { assertAtLeastFourChars, assertPositiveInteger, assertPublicAddress } from '../../utils/formValidation';

import { ViewContainer } from './containers/ViewerContainer';

import './Home.scss';

interface FormData {
  walletAddress: string;
  streamTopic: string;
  timeslice: string;
  minLiveThreshold: string;
  initBufferTime: string;
  buffer: string;
  dynamicBufferIncrement: string;
}

const formFields = [
  {
    name: 'walletAddress',
    label: 'Please add the public address that streams the feed',
    defaultValue: '',
    rules: { required: 'Wallet address is required', validate: assertPublicAddress },
  },
  {
    name: 'streamTopic',
    label: 'This is how others will find your stream',
    defaultValue: '',
    rules: { required: 'Topic is required', validate: assertAtLeastFourChars },
  },
  {
    name: 'timeslice',
    label: 'Set the timeslice',
    defaultValue: '2000',
    rules: { required: 'Timeslice is required', validate: assertPositiveInteger },
  },
  {
    name: 'minLiveThreshold',
    label: 'Set the min live threshold',
    defaultValue: '1',
    rules: { required: 'Min live threshold is required', validate: assertPositiveInteger },
  },
  {
    name: 'initBufferTime',
    label: 'Set the init buffer time',
    defaultValue: '5000',
    rules: { required: 'Init buffer time is required', validate: assertPositiveInteger },
  },
  {
    name: 'buffer',
    label: 'Set the buffer',
    defaultValue: '5',
    rules: { required: 'Buffer is required', validate: assertPositiveInteger },
  },
  {
    name: 'dynamicBufferIncrement',
    label: 'Set the dynamic buffer increment',
    defaultValue: '0',
    rules: { required: 'Dynamic buffer increment is required', validate: assertPositiveInteger },
  },
];

const items = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

export function Home() {
  const { control, handleSubmit } = useForm<FormData>();
  const [showPlayer, setShowPlayer] = useState(false);

  const showForm = useMemo(() => !showPlayer, [showPlayer]);

  const onSubmit = WithAsyncErrorBoundary(async (data: FormData) => {
    setPlayerOptions({
      timeslice: +data.timeslice,
      minLiveThreshold: +data.minLiveThreshold,
      initBufferTime: +data.dynamicBufferIncrement,
      buffer: +data.buffer,
      dynamicBufferIncrement: +data.dynamicBufferIncrement,
    });
    setFeedReader(data.streamTopic, remove0xPrefix(data.walletAddress));
    setShowPlayer(true);
  });

  return (
    <div className="home">
      {showPlayer && (
        <>
          <ViewContainer>
            <VideoPlayer />
            <JoinButton onClick={() => ({})} />
            <VideoList items={items} />
          </ViewContainer>
          <Chat />
        </>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormContainer className="browser-form">
            {formFields.map((field) => (
              <ControllerTextInput key={field.name} control={control} {...field} />
            ))}
            <Button type="submit">Find stream</Button>
          </FormContainer>
        </form>
      )}
    </div>
  );
}

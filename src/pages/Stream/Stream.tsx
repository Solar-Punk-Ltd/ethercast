import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BatchId } from '@ethersphere/bee-js';
import { useEthers } from '@usedapp/core';

import { assertAtLeastFourChars, assertBatchId, assertPositiveInteger } from '../..//utils/formValidation';
import { Button } from '../../components/Button/Button';
import { CheckInput } from '../../components/CheckInput/CheckInput';
import { FormContainer } from '../../components/FormContainer/FormContainer';
import { LiveIndicator } from '../../components/LiveIndicator/LiveIndicator';
import { ControllerTextInput } from '../../components/TextInput/ControllerTextInput';
import { WithAsyncErrorBoundary, WithErrorBoundary } from '../../hooks/WithErrorBoundary';
import { initChatRoom } from '../../libs/chat/src/core';
import { isStreamOngoing, startStream, stopStream } from '../../libs/stream';

import './Stream.scss';

interface FormData {
  key: string;
  streamTopic: string;
  stamp: string;
  timeslice: string;
  videoBitsPerSecond: string;
}

const formFields = [
  // TODO: keystore feat
  {
    name: 'key',
    label: 'Please provide your key for the feed',
    defaultValue: '',
    rules: { required: 'Key is required' },
  },
  {
    name: 'streamTopic',
    label: 'This is how others will find your stream',
    defaultValue: '',
    rules: { required: 'Topic is required', validate: assertAtLeastFourChars },
  },
  {
    name: 'stamp',
    label: 'Please provide a valid stamp',
    defaultValue: '',
    rules: { required: 'Stamp is required', validate: assertBatchId },
  },
  {
    name: 'timeslice',
    label: 'Set the timeslice',
    defaultValue: '1000',
    rules: { required: 'Timeslice is required', validate: assertPositiveInteger },
  },
  {
    name: 'videoBitsPerSecond',
    label: 'Set the video bits per second',
    defaultValue: '2500000',
    rules: { required: 'Video bits per second is required', validate: assertPositiveInteger },
  },
];

export function Stream() {
  const { account, library } = useEthers();
  const { control, handleSubmit, getValues } = useForm<FormData>();

  const [isLive, setIsLive] = useState(false);
  const [options, setOptions] = useState({
    audio: true,
    video: true,
  });

  useEffect(() => {
    setIsLive(isStreamOngoing());
  }, []);

  const onSubmit = WithAsyncErrorBoundary(async (data: FormData) => {
    if (!library) return;

    await startStream({ address: account!, key: data.key }, data.streamTopic, data.stamp as BatchId, {
      audio: options.audio,
      video: options.video,
      timeslice: +data.timeslice,
      videoBitsPerSecond: +data.videoBitsPerSecond,
    });

    await initChatRoom(data.streamTopic, data.stamp as BatchId);
    setIsLive(true);
  });

  const stop = WithErrorBoundary(() => {
    stopStream();
    setIsLive(false);
  });

  return (
    <div className="stream">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormContainer className="stream-form">
          {isLive ? (
            <>
              <LiveIndicator className="indicator" />
              <p>Account: {account}</p>
              <p>Topic: {getValues('streamTopic')}</p>
              <Button onClick={() => stop()}>Stop stream</Button>
            </>
          ) : (
            <>
              {formFields.slice(0, 3).map((field) => (
                <ControllerTextInput key={field.name} control={control} {...field} />
              ))}

              <div className="stream-options">
                <CheckInput
                  label="Audio"
                  checked={options.audio}
                  onChange={() => setOptions({ ...options, audio: !options.audio })}
                />
                <CheckInput
                  label="Video"
                  checked={options.video}
                  onChange={() => setOptions({ ...options, video: !options.video })}
                />
              </div>

              {options.video && (
                <>
                  {formFields.slice(3).map((field) => (
                    <ControllerTextInput key={field.name} control={control} {...field} />
                  ))}
                </>
              )}
              <Button type="submit">Start stream</Button>
            </>
          )}
        </FormContainer>
      </form>
    </div>
  );
}

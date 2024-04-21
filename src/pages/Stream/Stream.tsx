import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { BatchId } from '@solarpunk/bee-js';
import { useEthers } from '@usedapp/core';

import { assertAtLeastFourChars, assertBatchId, assertPositiveInteger } from '../..//utils/formValidation';
import { Button } from '../../components/Button/Button';
import { CheckInput } from '../../components/CheckInput/CheckInput';
import { FormContainer } from '../../components/FormContainer/FormContainer';
import { LiveIndicator } from '../../components/LiveIndicator/LiveIndicator';
import { TextInput } from '../../components/TextInput/TextInput';
import { WithAsyncErrorBoundary, WithErrorBoundary } from '../../hooks/WithErrorBoundary';
import { isStreamOngoing, startStream, stopStream } from '../../libs/stream';

import './Stream.scss';

interface FormData {
  key: string;
  streamTopic: string;
  stamp: string;
  timeslice: string;
  width: string;
  height: string;
  frameRate: string;
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
    defaultValue: '2000',
    rules: { required: 'Timeslice is required', validate: assertPositiveInteger },
  },
  {
    name: 'width',
    label: 'Set the video width',
    defaultValue: '640',
    rules: { required: 'Width is required', validate: assertPositiveInteger },
  },
  {
    name: 'height',
    label: 'Set the video height',
    defaultValue: '480',
    rules: { required: 'Height is required', validate: assertPositiveInteger },
  },
  {
    name: 'frameRate',
    label: 'Set the video frame rate',
    defaultValue: '30',
    rules: { required: 'Frame rate is required', validate: assertPositiveInteger },
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

  const onSubmit = async (data: FormData) => {
    if (!library) return;

    await startStream({ address: account!, key: data.key }, data.streamTopic, data.stamp as BatchId, {
      audio: options.audio,
      video: options.video,
      timeslice: +data.timeslice,
      videoDetails: options.video
        ? {
            width: +data.width,
            height: +data.height,
            frameRate: +data.frameRate,
          }
        : undefined,
    });

    setIsLive(true);
  };

  const stop = () => {
    stopStream();
    setIsLive(false);
  };

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
                <Controller
                  key={field.name}
                  name={field.name as keyof FormData}
                  rules={field.rules}
                  control={control}
                  defaultValue={field.defaultValue}
                  render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                    <TextInput
                      label={field.label}
                      name={field.name}
                      value={value}
                      onChange={onChange}
                      ref={ref}
                      error={error?.message}
                    />
                  )}
                />
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
                    <Controller
                      key={field.name}
                      name={field.name as keyof FormData}
                      rules={field.rules}
                      control={control}
                      defaultValue={field.defaultValue}
                      render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                        <TextInput
                          label={field.label}
                          name={field.name}
                          value={value}
                          onChange={onChange}
                          ref={ref}
                          error={error?.message}
                        />
                      )}
                    />
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

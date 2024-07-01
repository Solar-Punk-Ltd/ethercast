<<<<<<< HEAD
import { Fragment, useContext, useEffect, useState } from 'react';
import { BatchId } from '@ethersphere/bee-js';
import Tooltip from '@mui/material/Tooltip';
=======
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BatchId } from '@ethersphere/bee-js';
>>>>>>> demo
import { useEthers } from '@usedapp/core';

import { assertAtLeastFourChars, assertBatchId, assertPositiveInteger } from '../..//utils/formValidation';
import { Button } from '../../components/Button/Button';
import { CheckInput } from '../../components/CheckInput/CheckInput';
import { FormContainer } from '../../components/FormContainer/FormContainer';
import { LiveIndicator } from '../../components/LiveIndicator/LiveIndicator';
<<<<<<< HEAD
import { TextInput } from '../../components/TextInput/TextInput';
import { initChatRoom } from '../../libs/chat';
=======
import { ControllerTextInput } from '../../components/TextInput/ControllerTextInput';
import { WithAsyncErrorBoundary, WithErrorBoundary } from '../../hooks/WithErrorBoundary';
>>>>>>> demo
import { isStreamOngoing, startStream, stopStream } from '../../libs/stream';
import { MainContext } from '../../routes';

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
<<<<<<< HEAD
  const { setActualAccount } = useContext(MainContext);
  const [isLive, setIsLive] = useState(false);
  const [audio, setAudio] = useState<boolean>(true);
  const [video, setVideo] = useState<boolean>(true);
  const [tooltipText, setTooltipText] = useState<string>('Click to copy');
  const [timeslice, setTimeslice] = useState<number>(2000); // [ms]
  const [feedDataForm, setFeedDataForm] = useState<Record<string, CommonForm>>({
    key: {
      label: 'Please provide your key for the feed',
      placeholder: 'Key',
      value: '',
    },
    topic: {
      label: 'This is how others will find your stream',
      placeholder: 'Stream topic',
      value: '',
    },
    stamp: {
      label: 'Please provide a valid stamp',
      placeholder: 'Stamp',
      value: '79fd19404ee9c1e55a2cbaba31b66d3231f82c01bd3f3d7cfe039ca08f926881',
    },
  });
  const [streamDataForm, setStreamDataForm] = useState<Record<string, CommonForm>>({
    width: {
      label: 'Set the video width',
      placeholder: 'Width',
      value: 640,
    },
    height: {
      label: 'Set the video height',
      placeholder: 'Height',
      value: 480,
    },
    frameRate: {
      label: 'Set the video frame rate',
      placeholder: 'Frame rate',
      value: 30,
    },
=======
  const { control, handleSubmit, getValues } = useForm<FormData>();

  const [isLive, setIsLive] = useState(false);
  const [options, setOptions] = useState({
    audio: true,
    video: true,
>>>>>>> demo
  });

  useEffect(() => {
    setIsLive(isStreamOngoing());
  }, []);

  const onSubmit = WithAsyncErrorBoundary(async (data: FormData) => {
    if (!library) return;
<<<<<<< HEAD
    startStream(
      { address: account!, key: feedDataForm.key.value },
      feedDataForm.topic.value,
      feedDataForm.stamp.value as BatchId,
      {
        audio,
        video,
        timeslice,
        videoDetails: video
          ? {
              width: streamDataForm.width.value,
              height: streamDataForm.height.value,
              frameRate: streamDataForm.frameRate.value,
            }
          : undefined,
      },
    );
=======

    await startStream({ address: account!, key: data.key }, data.streamTopic, data.stamp as BatchId, {
      audio: options.audio,
      video: options.video,
      timeslice: +data.timeslice,
      videoBitsPerSecond: +data.videoBitsPerSecond,
    });
>>>>>>> demo

    // We save chatWriter to state, Graffiti-feed connector will be re-generated every time it is used (nothing needs to be saved)
    const result = await initChatRoom(feedDataForm.topic.value, feedDataForm.stamp.value as BatchId);
    if (!result) throw 'initChatRoom gave back null';

    setIsLive(true);
<<<<<<< HEAD
    setActualAccount(account!);
  };
=======
  });
>>>>>>> demo

  const stop = WithErrorBoundary(() => {
    stopStream();
    setIsLive(false);
  });

  const copyToClipboard = async (account: string | undefined) => {
    if (account) {
      try {
        await navigator.clipboard.writeText(account);
        setTooltipText('Copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy: ', error);
      }
    }
  };

  const handleTooltipClose = () => {
    setTooltipText('Click to copy');
  };

  return (
    <div className="stream">
<<<<<<< HEAD
      <FormContainer className="stream-form">
        {isLive ? (
          <>
            <LiveIndicator className="indicator" />
            <div className="account">
              Account:{' '}
              <Tooltip title={tooltipText} placement="top" onClose={handleTooltipClose}>
                <div
                  className="accountText"
                  onClick={() => {
                    copyToClipboard(account);
                  }}
                >
                  {account}
                </div>
              </Tooltip>
            </div>
            <p>Topic: {feedDataForm.topic.value}</p>
            <Button onClick={() => stop()}>Stop stream</Button>
          </>
        ) : (
          <>
            {Object.entries(feedDataForm).map(([key, value]) => (
              <Fragment key={key}>
                <p>{value.label}</p>
                <TextInput
                  placeholder={value.placeholder}
                  value={value.value}
                  name={key}
                  onChange={onFormChange(feedDataForm, setFeedDataForm)}
                />
              </Fragment>
            ))}

            <CheckInput label="Audio" checked={audio} onChange={() => setAudio(!audio)} />
            <CheckInput label="Video" checked={video} onChange={() => setVideo(!video)} />

            <p>Set the timeslice</p>
            <TextInput
              placeholder="Timeslice"
              value={timeslice}
              name="timeslice"
              onChange={(event) => setTimeslice(parseInt(event.target.value, 10))}
            />

            {video &&
              Object.entries(streamDataForm).map(([key, value]) => (
                <Fragment key={key}>
                  <p>{value.label}</p>
                  <TextInput
                    key={key}
                    placeholder={value.placeholder}
                    value={value.value}
                    name={key}
                    onChange={onFormChange(streamDataForm, setStreamDataForm)}
                  />
                </Fragment>
=======
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
>>>>>>> demo
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

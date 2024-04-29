import { Fragment, useEffect, useState } from 'react';
import { BatchId } from '@solarpunk/bee-js';
import { useEthers } from '@usedapp/core';
import { produce } from 'immer';

import { Button } from '../../components/Button/Button';
import { CheckInput } from '../../components/CheckInput';
import { FormContainer } from '../../components/FormContainer';
import { LiveIndicator } from '../../components/LiveIndicator/LiveIndicator';
import { TextInput } from '../../components/TextInput/TextInput';
import { isStreamOngoing, startStream, stopStream } from '../../libs/stream';

import './Stream.scss';
import { initChatRoom, registerUser, updateUserList } from '../../libs/chat';
import { ethers } from 'ethers';

interface CommonForm {
  label: string;
  placeholder: string;
  value: any;
}

export function Stream() {
  const { account, library } = useEthers();

  const [isLive, setIsLive] = useState(false);
  const [audio, setAudio] = useState<boolean>(true);
  const [video, setVideo] = useState<boolean>(true);
  const [timeslice, setTimeslice] = useState<number>(2000); // [ms
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
      value: '7d9c6e77d52b01380b9b60eab0a0739ec8876dc99b55bff657d44e7d207c1064',
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
  });

  useEffect(() => {
    setIsLive(isStreamOngoing());
  }, []);

  const start = async () => {
    if (!library) return;

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

    initChatRoom(feedDataForm.topic.value, feedDataForm.stamp.value as BatchId);

    setIsLive(true);
  };

  const stop = () => {
    stopStream();
    setIsLive(false);
  };

  const onFormChange =
    (form: Record<string, any>, onChange: (form: Record<string, any>) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextState = produce(form, (draft) => {
        draft[event.target.name].value = event.target.value;
      });
      onChange(nextState);
    };

  return (
    <div className="stream">
      <FormContainer className="stream-form">
        {isLive ? (
          <>
            <LiveIndicator className="indicator" />
            <p>Account: {account}</p>
            <p>Topic: {feedDataForm.topic.value}</p>
            <button onClick={() => updateUserList(feedDataForm.topic.value)}>DOWNLOAD USER LIST</button>
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
              ))}
            <Button onClick={start}>Start stream</Button>
          </>
        )}
      </FormContainer>
    </div>
  );
}
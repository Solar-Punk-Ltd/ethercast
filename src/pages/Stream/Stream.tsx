import { Fragment, useEffect, useReducer, useState } from 'react';
import { BatchId, FeedWriter } from '@solarpunk/bee-js';
import { useEthers } from '@usedapp/core';
import { produce } from 'immer';

import { Button } from '../../components/Button/Button';
import { CheckInput } from '../../components/CheckInput';
import { FormContainer } from '../../components/FormContainer';
import { LiveIndicator } from '../../components/LiveIndicator/LiveIndicator';
import { TextInput } from '../../components/TextInput/TextInput';
import { isStreamOngoing, startStream, stopStream } from '../../libs/stream';

import './Stream.scss';
import { initChatRoom, updateUserList } from '../../libs/chat';
import Tooltip from '@mui/material/Tooltip';
import { 
  FETCH_MESSAGES_INTERVAL, 
  UPDATE_USER_LIST_INTERVAL, 
  chatAggregatorReducer, 
  doMessageFetch, 
  initialStateForChatAggregator, 
  doUpdateUserList, 
  doAggregationCycle
} from '../../libs/chatAggregator';

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
  const [tooltipText, setTooltipText] = useState<string>('Click to copy');
  const [timeslice, setTimeslice] = useState<number>(2000); // [ms]
  const [chatWriter, setChatWriter] = useState<FeedWriter | null>(null);
  const [chatState, dispatch] = useReducer(chatAggregatorReducer, initialStateForChatAggregator);
  const [time, setTime] = useState(Date.now());
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
      value: '6f3620fea619345adca73912a760571b577e4167bac4ed3bbb37e8448cd93061',
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

  // Periodical updates
  useEffect(() => {
    if (!chatWriter) return;
    const fetchMessagesInterval = setInterval(() => {
      setTime(Date.now())
    }, FETCH_MESSAGES_INTERVAL);
    
    return () => {
      clearInterval(fetchMessagesInterval);
    };
  }, [chatWriter]);
  
  useEffect(() => {
    if (!chatWriter) return;
    doAggregationCycle(chatState, feedDataForm.topic.value, chatWriter, feedDataForm.stamp.value as BatchId, dispatch);
    doUpdateUserList(feedDataForm.topic.value, chatState, dispatch);  
  }, [time]);

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

    const result = await initChatRoom(feedDataForm.topic.value, feedDataForm.key.value, feedDataForm.stamp.value as BatchId);
    if (!result) throw 'initChatRoom gave back null';
    setChatWriter(result.chatWriter);
    

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
            <button onClick={() => doAggregationCycle(chatState, feedDataForm.topic.value, chatWriter!, feedDataForm.stamp.value, dispatch)}>AGGREGATE MESSAGES</button>
            <button onClick={() => doUpdateUserList(feedDataForm.topic.value, chatState, dispatch)}>DOWNLOAD USER LIST</button>
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
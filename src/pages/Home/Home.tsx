import { Fragment, useMemo, useState, useContext } from 'react';
import { produce } from 'immer';

import { Button } from '../../components/Button/Button';
import { Chat } from '../../components/Chat/Chat';
import { FormContainer } from '../../components/FormContainer';
import { JoinButton } from '../../components/JoinButton/JoinButton';
import { TextInput } from '../../components/TextInput/TextInput';
import { VideoList } from '../../components/VideoList/VideoList';
import { VideoPlayer } from '../../components/VideoPlayer/VideoPlayer';
import { setFeedReader, setPlayerOptions } from '../../libs/player';

import { ViewContainer } from './containers/ViewerContainer';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import Tooltip from '@mui/material/Tooltip';

import './Home.scss';
import { MainContext } from '../../routes';

interface CommonForm {
  label: string;
  placeholder: string;
  value: any;
}

const items = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

export function Home() {
  const [showPlayer, setShowPlayer] = useState(false);
  const { setActualAccount, setActualTopic } = useContext(MainContext);
  const [feedDataForm, setFeedDataForm] = useState<Record<string, CommonForm>>({
    address: {
      label: 'Please add the public address that streams the feed',
      placeholder: 'Wallet address',
      value: '',
    },
    topic: {
      label: 'The topic of the stream',
      placeholder: 'Stream topic',
      value: '',
    },
    stamp: {
      label: 'Please provide a valid stamp',
      placeholder: 'Stamp',
      value: '',
    },
  });
  const [playerOptionsForm, setPlayerOptionsForm] = useState<Record<string, CommonForm>>({
    timeslice: {
      label: 'Timeslice',
      placeholder: 'Timeslice',
      value: 2000,
    },
    minLiveThreshold: {
      label: 'Min live threshold',
      placeholder: 'Min live threshold',
      value: 1,
    },
    initBufferTime: {
      label: 'Init buffer time',
      placeholder: 'Init buffer time',
      value: 5000,
    },
    buffer: {
      label: 'Buffer',
      placeholder: 'Buffer',
      value: 5,
    },
    dynamicBufferIncrement: {
      label: 'Init Dynamic buffer increment',
      placeholder: 'Dynamic buffer increment',
      value: 0,
    },
  });

  const showForm = useMemo(() => !showPlayer, [showPlayer]);

  const onFormChange =
    (form: Record<string, any>, onChange: (form: Record<string, any>) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextState = produce(form, (draft) => {
        draft[event.target.name].value = event.target.value;
      });
      onChange(nextState);
    };

  const findStream = () => {
    setPlayerOptions({
      timeslice: playerOptionsForm.timeslice.value,
      minLiveThreshold: playerOptionsForm.minLiveThreshold.value,
      initBufferTime: playerOptionsForm.initBufferTime.value,
      buffer: playerOptionsForm.buffer.value,
      dynamicBufferIncrement: playerOptionsForm.dynamicBufferIncrement.value,
    });
    setFeedReader(feedDataForm.topic.value, feedDataForm.address.value);
    setShowPlayer(true);
    setActualAccount(feedDataForm.address.value);
    setActualTopic(feedDataForm.topic.value);
  };

  const pasteFromClipBoard = async () => {
    const clipboardData = await navigator.clipboard.readText();
    setFeedDataForm((prevState) => ({
      ...prevState,
      address: {
        ...prevState.address,
        value: clipboardData,
      },
    }));
  };

  return (
    <div className="home">
      {showPlayer && (
        <div className="stream-chat-container">
          <ViewContainer>
            <VideoPlayer />
            <JoinButton onClick={() => ({})} />
            <VideoList items={items} />
          </ViewContainer>
          <Chat feedDataForm={feedDataForm} />
        </div>
      )}

      {showForm && (
        <FormContainer className="browser-form">
          <Tooltip title="Paste from clipboard" placement="top">
            <ContentPasteIcon className="pasteIcon" onClick={pasteFromClipBoard} />
          </Tooltip>
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
          {Object.entries(playerOptionsForm).map(([key, value]) => (
            <Fragment key={key}>
              <p>{value.label}</p>
              <TextInput
                placeholder={value.placeholder}
                value={value.value}
                name={key}
                onChange={onFormChange(playerOptionsForm, setPlayerOptionsForm)}
              />
            </Fragment>
          ))}
          <Button onClick={findStream}>Find stream</Button>
        </FormContainer>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EditIcon from '@mui/icons-material/Edit';

import { loadMessagesToUI, MessageData, registerUser, startFetchingForNewUsers } from '../../libs/chat';
import { TextInput } from '../TextInput/TextInput';

import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';

import './Chat.scss';

interface ChatProps {
  feedDataForm: Record<string, any>;
}

const refreshInterval = 2000;
const userUpdateInterval = 5000;

export function Chat({ feedDataForm }: ChatProps) {
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const programScrolling = useRef(false);

  const nickName = nickNames[actualAccount] ? nickNames[actualAccount][actualTopic] : '';

  const [nickNames, setNickNames] = useState<any>();
  const [nickName, setNickname] = useState(nickName);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newUnseenMessages, setNewUnseenMessages] = useState(false);
  const [loadedMessages, setLoadedMessages] = useState<MessageData[]>([]);

  // Set a timer, to check for new messages
  useEffect(() => {
    const messageLoader = setInterval(() => {
      const messages = loadMessagesToUI(0);
      setLoadedMessages(messages);
    }, refreshInterval);

    const userUpdater = setInterval(() => {
      startFetchingForNewUsers(feedDataForm.topic.value);
    }, userUpdateInterval);

    return () => {
      clearInterval(messageLoader);
      clearInterval(userUpdater);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (chatBodyRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;

        programScrolling.current = scrollTop + clientHeight + 1 >= scrollHeight;
        if (programScrolling.current) setNewUnseenMessages(false);
      }
    };

    if (chatBodyRef.current) {
      chatBodyRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatBodyRef.current) {
        chatBodyRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      programScrolling.current = true;
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (programScrolling.current && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
    if (!programScrolling.current) {
      setNewUnseenMessages(true);
    }
  }, [loadedMessages]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (event.target.className === 'layout') {
        setIsEditMode(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    console.log(nickNames);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isEditMode, nickNames]);

  const nicknameChoosed = async () => {
    if (nickName === '') {
      return;
    }

    const result = await registerUser(
      feedDataForm.topic.value,
      feedDataForm.address.value,
      nickName,
      feedDataForm.stamp.value,
    );
    if (!result) throw 'Error registering user!';

    setNickNames((prevState: any) => ({
      ...prevState,
      [actualAccount]: { ...prevState[actualAccount], [actualTopic]: nickname },
    }));
  };

  return (
    <div className="chat">
      <div>
        {!!nickName && (
          <div className="actualNickName">
            <span>Your Nickname: {nickName}</span>
          </div>
        )}

        <div className="body" ref={chatBodyRef}>
          {loadedMessages.map((m: MessageData, i: number) => (
            <Message
              key={i}
              name={m.username || 'admin'}
              message={m.message || 'loading'}
              own={nickName == m.username}
            />
          ))}
        </div>
      </div>

      {newUnseenMessages && (
        <button
          className="unseenMessages"
          onClick={() => {
            if (chatBodyRef.current) {
              chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
            }
            setNewUnseenMessages(false);
          }}
        >
          New messages <ArrowDownwardIcon style={{ fontSize: '15px', marginLeft: '10px' }} />
        </button>
      )}
      {!nickName ? (
        <div className="header">
          {!isEditMode && <span style={{ fontSize: '13px' }}>Enter a Nickname to use chat</span>}
          {isEditMode && (
            <TextInput
              className="set-name"
              value={nickName}
              name={'nickname'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
              placeholder="Choose a nickname"
            />
          )}
          {!isEditMode ? (
            <button className="nickNameEditButton" onClick={() => setIsEditMode(!isEditMode)}>
              <EditIcon style={{ fontSize: 16 }} />
            </button>
          ) : (
            <div className="editButtons">
              <button onClick={() => nicknameChoosed()} className="okButton">
                OK
              </button>
              <button onClick={() => setIsEditMode(!isEditMode)} className="closeButton">
                X
              </button>
            </div>
          )}
        </div>
      ) : (
        <Controls
          topic={feedDataForm.topic.value}
          nickname={nickName}
          stamp={feedDataForm.stamp.value}
          streamerAddress={feedDataForm.address.value}
          newUnseenMessages={newUnseenMessages}
        />
      )}
    </div>
  );
}

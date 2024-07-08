import { useCallback, useEffect, useRef, useState } from 'react';
import { useEthers } from '@usedapp/core';

import { useModal } from '../../app/Modal/ModalProvider';
import {
  EVENTS,
  getChatActions,
  initUsers,
  MessageData,
  ParticipantDetails,
  registerUser,
  UserWithIndex,
} from '../../libs/chat';
import { ChatModal } from '../ChatModal/ChatModal';

import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';

import './Chat.scss';

interface ChatProps {
  topic: string;
  streamerAddress: string;
}

enum WriteMode {
  NICK,
  MESSAGE,
}

const MESSAGE_CHECK_INTERVAL = 4000;
const USER_UPDATE_INTERVAL = 8000;

export function Chat({ topic }: ChatProps) {
  const { account, isLoading } = useEthers();
  const { openModal, closeModal } = useModal();

  const initRef = useRef(true);

  const [user, setUser] = useState<UserWithIndex>();
  const [writeMode, setWriteMode] = useState<WriteMode>(WriteMode.NICK);
  const [nickName, setNickname] = useState('');
  const [stamp, setStamp] = useState('');
  const [key, setKey] = useState('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingUserInit, setLoadingUserInit] = useState(true);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    initUsers(topic)
      .then((users) => {
        if (users?.length && account) {
          const user = users.find((u) => u.address.toLocaleLowerCase() === account.toLocaleLowerCase());
          setUser(user);
        }
      })
      .finally(() => {
        setLoadingUserInit(false);
      });
  }, [account, topic, isLoading]);

  useEffect(() => {
    if (!loadingUserInit && initRef.current) {
      const { on, off, startFetchingForNewUsers, startLoadingNewMessages } = getChatActions();

      const userUpdater = setInterval(startFetchingForNewUsers(topic), USER_UPDATE_INTERVAL);
      const messageLoader = setInterval(startLoadingNewMessages(topic), MESSAGE_CHECK_INTERVAL);

      const handleMessageLoad = (newMessages: MessageData[]) => {
        setMessages((prevMessages) => {
          const uniqueNewMessages = newMessages.filter(
            (newMsg) => !prevMessages.some((prevMsg) => prevMsg.timestamp === newMsg.timestamp),
          );
          return [...prevMessages, ...uniqueNewMessages];
        });
      };
      on(EVENTS.LOAD_MESSAGE, handleMessageLoad);

      initRef.current = false;

      return () => {
        clearInterval(userUpdater);
        clearInterval(messageLoader);
        off(EVENTS.LOAD_MESSAGE, handleMessageLoad);
      };
    }
  }, [loadingUserInit, topic]);

  const joinToChat = useCallback(
    async (participantDetails: ParticipantDetails) => {
      if (!participantDetails.nickName || !participantDetails.stamp || !participantDetails.participant) {
        return;
      }

      if (!user) {
        await registerUser(topic, participantDetails);
      }

      setWriteMode(WriteMode.MESSAGE);
      setStamp(participantDetails.stamp);
      setNickname(participantDetails.nickName);
      setKey(participantDetails.key);

      closeModal();
    },
    [closeModal, topic, user],
  );

  const handleOpenModal = useCallback(
    () => openModal(<ChatModal user={user} onAction={joinToChat} />),
    [user, openModal, joinToChat],
  );

  return (
    <div className="chat">
      <div>
        {!!nickName && (
          <div className="actualNickName">
            <span>Your Nickname: {nickName}</span>
          </div>
        )}

        <div className="body">
          {messages.map((m: MessageData, i: number) => (
            <Message
              key={i}
              name={m.username || 'admin'}
              message={m.message || 'loading'}
              own={nickName == m.username}
            />
          ))}
        </div>
      </div>

      {writeMode === WriteMode.NICK ? (
        <div className="register-container">
          <button onClick={handleOpenModal} className="okButton" disabled={loadingUserInit}>
            Join to chat
          </button>
        </div>
      ) : (
        <Controls privateKey={key} topic={topic} nickname={nickName} stamp={stamp as any} />
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEthers } from '@usedapp/core';

import { useModal } from '../../app/Modal/ModalProvider';
import {
  EVENTS,
  getChatActions,
  initUsers,
  registerUser,
} from '../../libs/chat/';
import { ChatModal } from '../ChatModal/ChatModal';

import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';

import './Chat.scss';
import { MessageData, ParticipantDetails, UserWithIndex } from '../../libs/chat/'
import { retryAsync, retryAwaitableAsync } from '../../utils/common';

interface ChatProps {
  topic: string;
}

enum WriteMode {
  NICK,
  MESSAGE,
}

const MESSAGE_CHECK_INTERVAL = 1000;
const USER_UPDATE_INTERVAL = 8000;

export function Chat({ topic }: ChatProps) {
  const { account, isLoading } = useEthers();
  const { openModal, closeModal } = useModal();

  const chatBodyRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<UserWithIndex>();
  const [writeMode, setWriteMode] = useState<WriteMode>(WriteMode.NICK);
  const [nickName, setNickname] = useState('');
  const [stamp, setStamp] = useState('');
  const [key, setKey] = useState('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingUserInit, setLoadingUserInit] = useState(true);

  useEffect(() => {
    const { on, off } = getChatActions();

    const handleMessageLoad = (newMessages: MessageData[]) => {
      setMessages((prevMessages) => {
        const uniqueNewMessages = newMessages.filter(
          (newMsg) => !prevMessages.some((prevMsg) => prevMsg.timestamp === newMsg.timestamp),
        );
        return [...prevMessages, ...uniqueNewMessages];
      });

      // Schedule a scroll after the state update if we're already at the bottom
      if (isScrolledToBottom()) {
        setTimeout(scrollToBottom, 0);
      }
    };

    const handleInitLoad = (l: boolean) => setLoadingUserInit(l);

    on(EVENTS.LOAD_MESSAGE, handleMessageLoad);
    on(EVENTS.LOADING_INIT_USERS, handleInitLoad);

    return () => {
      off(EVENTS.LOAD_MESSAGE, handleMessageLoad);
      off(EVENTS.LOADING_INIT_USERS, handleInitLoad);
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    retryAsync(() => initUsers(topic).then((users) => {
      if (users?.length && account) {
        const user = users.find((u) => u.address.toLocaleLowerCase() === account.toLocaleLowerCase());
        setUser(user);
      }
    }));
  }, [account, topic, isLoading]);

  useEffect(() => {
    if (!loadingUserInit) {
      const { startFetchingForNewUsers, startLoadingNewMessages } = getChatActions();

      const userUpdater = setInterval(startFetchingForNewUsers(topic), USER_UPDATE_INTERVAL);
      const messageLoader = setInterval(startLoadingNewMessages(topic), MESSAGE_CHECK_INTERVAL);

      return () => {
        clearInterval(userUpdater);
        clearInterval(messageLoader);
      };
    }
  }, [loadingUserInit, topic]);

  const joinToChat = useCallback(
    async (participantDetails: ParticipantDetails) => {
      if (!participantDetails.nickName || !participantDetails.stamp || !participantDetails.participant) {
        return;
      }

      if (!user) {
        await retryAwaitableAsync(() => registerUser(topic, participantDetails));
      }

      setWriteMode(WriteMode.MESSAGE);
      setStamp(participantDetails.stamp);
      setNickname(participantDetails.nickName);
      setKey(participantDetails.key);

      closeModal();
    },
    [closeModal, topic, user],
  );

  const isScrolledToBottom = () => {
    if (chatBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
      return Math.abs(scrollHeight - clientHeight - scrollTop) < 1;
    }
    return false;
  };

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  const handleOpenModal = useCallback(
    () => openModal(<ChatModal user={user} onAction={joinToChat} />),
    [user, openModal, joinToChat],
  );

  return (
    <div className="chat">
      <div>
        {!!nickName && (
          <div className="actual-nickname">
            <span>Your Nickname: {nickName}</span>
          </div>
        )}

        <div className="body" ref={chatBodyRef}>
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
          <button onClick={handleOpenModal} disabled={loadingUserInit}>
            Join to chat
          </button>
        </div>
      ) : (
        <Controls 
          privateKey={key} 
          topic={topic}
          nickname={nickName}
          stamp={stamp as any}
          reJoin={joinToChat}
        />
      )}
    </div>
  );
}

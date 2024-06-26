import { useEffect, useReducer, useState, createContext, useContext, useRef } from 'react';
import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';
import { TextInput } from '../TextInput/TextInput';
import { EthAddress, MessageData, readSingleMessage, receiveMessage, registerUser } from '../../libs/chat';
import { MainContext } from '../../routes.tsx';
import EditIcon from '@mui/icons-material/Edit';
import './Chat.scss';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { chatUserSideReducer, initialStateForChatUserSide, readNextMessage } from '../../libs/chatUserSide.ts';

export const LayoutContext = createContext({ chatBodyHeight: 'auto', setChatBodyHeight: (_: string) => {} });

interface ChatProps {
  feedDataForm: Record<string, any>;
}

export function Chat({ feedDataForm }: ChatProps) {
  const { nickNames, setNickNames, actualAccount, actualTopic } = useContext(MainContext);
  const nickName = nickNames[actualAccount] ? nickNames[actualAccount][actualTopic] : '';
  const [state, dispatch] = useReducer(chatUserSideReducer, initialStateForChatUserSide);
  const [chatBodyHeight, setChatBodyHeight] = useState('auto');
  const [nickname, setNickname] = useState(nickName);
  const readInterval = 3000;
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNickNameSet, setIsNickNameSet] = useState(nickname ? true : false);
  const [time, setTime] = useState(Date.now());
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const programScrolling = useRef(false);
  const [newUnseenMessages, setNewUnseenMessages] = useState(false);


  // --TEMPORARY--
  const [otherParty, setOtherParty] = useState<EthAddress | null>(null);
  // ----

  // Set a timer, to check for new messages
  useEffect(() => {
    if (true) {
      const messageChecker = setInterval(async () => {
        setTime(Date.now());
      }, readInterval);
      return () => clearInterval(messageChecker);
    }
  }, []);

  useEffect(() => {
    if (isNickNameSet) {
      const addr = window.prompt("Address of the other party");
      setOtherParty(addr as EthAddress);
    }
  }, [isNickNameSet]);

  useEffect(() => {
    if (!otherParty) return;
    const index = 0;      // Later we could change this to fetch current position
    readSingleMessage(index, feedDataForm.topic.value, otherParty, receiveMessage);
  }, [otherParty]);

  useEffect(() => {
    readNextMessage(state, feedDataForm.topic.value, feedDataForm.address.value, dispatch);
  }, [time]);
  
  const scrollToBottom = () => {
    if (programScrolling.current && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };
  const handleScroll = () => {
    if (chatBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;

      programScrolling.current = scrollTop + clientHeight + 1 >= scrollHeight;
      if (programScrolling.current) setNewUnseenMessages(false);
    }
  };
  useEffect(() => {
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
    scrollToBottom();
    if (!programScrolling.current) {
      setNewUnseenMessages(true);
    }
  }, [state.messages]);

  const handleClickOutside = (event: any) => {
    if (event.target.className === 'layout') {
      setIsEditMode(false);
    }
  };


  
  const nicknameChoosed = async () => {
    if (nickname === '') {
      return;
    }
    setIsNickNameSet(true);

    const result = await registerUser(feedDataForm.topic.value, feedDataForm.address.value, nickname, feedDataForm.stamp.value);
    if (!result) throw "Error registering user!";

    setNickNames((prevState: any) => ({
      ...prevState,
      [actualAccount]: { ...prevState[actualAccount], [actualTopic]: nickname },
    }));
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    console.log(nickNames);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isEditMode, nickNames]);


  return (
    <LayoutContext.Provider value={{ chatBodyHeight, setChatBodyHeight }}>
      <div className="chat">
        <div>
          {isNickNameSet ? (
            <div className="actualNickName">
              <span>Your Nickname: {nickname}</span>
            </div>
          ) : null}

          <div className="body" ref={chatBodyRef}>
            {state.messages.map((m: MessageData, i: number) => {
              if (!m) return <Message key={i} name={'admin'} message={'loading'} own={false} />;
              else return <Message key={i} name={m.username} message={m.message} own={nickname == m.username} />;
            })}
          </div>
        </div>

        {newUnseenMessages ? (
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
        ) : null}
        {!isNickNameSet ? (
          <div className="header">
            {!isEditMode && <span style={{ fontSize: '13px' }}>Enter a Nickname to use chat</span>}
            {isEditMode && (
              <TextInput
                className="set-name"
                value={nickname}
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
            nickname={nickname}
            stamp={feedDataForm.stamp.value}
            streamerAddress={feedDataForm.address.value}
            state={state}
            dispatch={dispatch}
            newUnseenMessages={newUnseenMessages}
          />
        )}
      </div>
    </LayoutContext.Provider>
  );
}

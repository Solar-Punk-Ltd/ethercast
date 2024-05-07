import { useEffect, useReducer, useState, createContext, useContext } from 'react';
import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';
import { TextInput } from '../TextInput/TextInput';
import { MessageData, registerUser } from '../../libs/chat';
import EditIcon from '@mui/icons-material/Edit';
import './Chat.scss';
import { MainContext } from '../../routes.tsx';
import { chatUserSideReducer, initialStateForChatUserSide, readNextMessage } from '../../libs/chatUserSide.ts';

export const LayoutContext = createContext({ chatBodyHeight: 'auto', setChatBodyHeight: (_: string) => {} });

interface ChatProps {
  feedDataForm: Record<string, any>;
}

export function Chat({ feedDataForm }: ChatProps) {
  const { mainNickName, setMainNickName } = useContext(MainContext);
  const [state, dispatch] = useReducer(chatUserSideReducer, initialStateForChatUserSide);
  const [chatBodyHeight, setChatBodyHeight] = useState('auto');
  const [nickname, setNickname] = useState(mainNickName);
  const readInterval = 3000;
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNickNameSet, setIsNickNameSet] = useState(mainNickName !== '' ? true : false);
  const [time, setTime] = useState(Date.now());

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
    readNextMessage(state, feedDataForm.topic.value, feedDataForm.address.value, dispatch);
  }, [time]);

  const handleClickOutside = (event: any) => {
    if (event.target.className === 'layout') {
      setIsEditMode(false);
    }
  };

  const nicknameChoosed = async () => {
    if (nickname === '') {
      return;
    }
    const result = await registerUser(feedDataForm.topic.value, feedDataForm.address.value, nickname, feedDataForm.stamp.value);
    if (!result) throw "Error registering user!";
        
    setIsNickNameSet(true);
    setMainNickName(nickname);
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isEditMode]);


  return (
    <LayoutContext.Provider value={{ chatBodyHeight, setChatBodyHeight }}>
      <div className="chat">
        <div>
          {isNickNameSet ? (
            <div className="actualNickName">
              <span>Your Nickname: {nickname}</span>
            </div>
          ) : null}

          <div className="body">
            {state.messages.map((m: MessageData, i: number) => {
              if (!m) return <Message key={i} name={'admin'} message={'loading'} own={false} />;
              else return <Message key={i} name={m.username} message={m.message} own={nickname == m.username} />;
            })}
          </div>
        </div>

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
              <button onClick={() => setIsEditMode(!isEditMode)}>
                <EditIcon />
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
            streamerAddress={feedDataForm.address.value}
            nickname={nickname}
            stamp={feedDataForm.stamp.value}
            state={state}
            dispatch={dispatch}
          />
        )}
      </div>
    </LayoutContext.Provider>
  );
}

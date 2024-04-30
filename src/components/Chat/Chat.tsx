import { useEffect, useReducer, useState, createContext, useContext } from 'react';
import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';
import { TextInput } from '../TextInput/TextInput';
import { MessageData, RoomID, getGraffitiFeedIndex, readSingleMessage, registerUser } from '../../libs/chat';
import { loadMessages, saveMessages, generateRoomId } from '../../utils/chat';
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
  const [initialized, setInitialized] = useState(false);
  const [chatBodyHeight, setChatBodyHeight] = useState('auto');
  const [nickname, setNickname] = useState(mainNickName); // Our name
  const readInterval = 3000;
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNickNameSet, setIsNickNameSet] = useState(mainNickName !== '' ? true : false);
  const [time, setTime] = useState(Date.now());

  // Load the messages from Swarm
  if (!initialized) init();

  // Set a timer, to check for new messages
  useEffect(() => {
    if (initialized) {
      const messageChecker = setInterval(async () => {
        await readNextMessage(state, feedDataForm.topic.value, feedDataForm.address.value, dispatch);
      }, readInterval);
      return () => clearInterval(messageChecker);
    }
  }, [initialized]);

  // useEffect(() => {
  //   readNextMessage();
  // }, [time]);

  // Init the chat application
  async function init() {
    // await readMessagesOnLoad();
    setInitialized(() => true);
  }

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
        
    setIsNickNameSet(true);
    setMainNickName(nickname);
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isEditMode]);

  // Reads those messags from Swarm, that does not exist in localStorage
  // async function readMessagesOnLoad() {
  //   const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
  //   const feedIndex: number = Number(await getGraffitiFeedIndex(roomId));

  //   for (let i = state.messages.length; i < feedIndex; i++) {
  //     const message = await readSingleMessage(i, roomId, feedDataForm.address.value);
  //     dispatch({
  //       type: 'insertMessage',
  //       message: message,
  //       index: i,
  //     });
  //     saveMessages(feedDataForm.topic.value, state.messages);
  //   }
  // }


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
              else return <Message key={i} name={m.name} message={m.message} own={nickname == m.name} />;
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

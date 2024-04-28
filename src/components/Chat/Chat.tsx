import { useEffect, useReducer, useState, createContext } from 'react';
import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';
import { TextInput } from '../TextInput/TextInput';
import { MessageData, RoomID, getUpdateIndex, readSingleMessage } from '../../libs/chat';
import { loadMessages, saveMessages, generateRoomId } from '../../utils/chat';
import EditIcon from '@mui/icons-material/Edit';
import './Chat.scss';
import { sleep } from '../../utils/common';

export const LayoutContext = createContext({ chatBodyHeight: 'auto', setChatBodyHeight: (_: string) => {} });

interface ChatProps {
  feedDataForm: Record<string, any>;
}

interface ChatState {
  messages: MessageData[];
  readIndex: number;
}

type MessageAction =
  | { type: 'insertMessage'; index: number; message: MessageData }
  | { type: 'deleteMessage'; index: number }
  | { type: 'incrementReadIndex' }
  | { type: 'resetReadIndex' };

function messagesReducer(state: { messages: MessageData[]; readIndex: number }, action: MessageAction): ChatState {
  switch (action.type) {
    case 'incrementReadIndex':
      return { ...state, readIndex: state.readIndex + 1 };
    case 'resetReadIndex':
      return { ...state, readIndex: 0 };
    case 'insertMessage':
      const messages = [...state.messages];
      messages[action.index] = action.message;
      return { ...state, messages };
    case 'deleteMessage':
      return {
        ...state,
        messages: state.messages.filter((_, index) => index !== action.index),
      };
    default:
      throw new Error();
  }
}

export function Chat({ feedDataForm }: ChatProps) {
  const initialState: ChatState = {
    messages: loadMessages(feedDataForm.topic.value),
    readIndex: loadMessages(feedDataForm.topic.value).length,
  };
  const [state, dispatch] = useReducer(messagesReducer, initialState);
  const [initialized, setInitialized] = useState(false);
  const [chatBodyHeight, setChatBodyHeight] = useState('auto');
  const [nickname, setNickname] = useState('tester'); // Our name
  const readInterval = 3000;
  const [isEditMode, setIsEditMode] = useState(true);
  const [time, setTime] = useState(Date.now());

  // Load the messages from Swarm
  //if (!initialized) init();

  // Set a timer, to check for new messages
  useEffect(() => {
    if (initialized) {
      const messageChecker = setInterval(async () => {
        await checkForMessages();
      }, readInterval);
      return () => clearInterval(messageChecker);
    }
  }, [initialized]);

  useEffect(() => {
    readNextMessage();
  }, [time]);

  // Init the chat application
  async function init() {
    await readMessagesOnLoad();
    setInitialized(() => true);
  }

  // Reads those messags from Swarm, that does not exist in localStorage
  async function readMessagesOnLoad() {
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
    const feedIndex: number = Number(await getGraffitiFeedIndex(roomId));

    for (let i = state.messages.length; i < feedIndex; i++) {
      const message = await readSingleMessage(i, roomId, feedDataForm.address.value);
      dispatch({
        type: 'insertMessage',
        message: message,
        index: i,
      });
      saveMessages(feedDataForm.topic.value, state.messages);
    }
  }

  // Will update feedIndex, will do message fetch as well, if feed index changed.
  async function checkForMessages() {
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);

    let feedIndex: number = Number(await getGraffitiFeedIndex(roomId));
    if (state.readIndex > feedIndex) {
      console.error('Warning! readIndex is higher then feedIndex, this should never happen!');
      console.info('Setting readIndex to 0');
      console.log("feedIndex: ", feedIndex)
      console.log("readIndex: ", state.readIndex)
      //dispatch({ type: 'resetReadIndex' });
    }

    if (feedIndex === -1) {
      console.warn(
        'Warning! getUpdateIndex gave back an error, possibly the feed is not ready yet. Retrying in 1 second',
      );
      return;
    }

    if (feedIndex > state.readIndex) {
      console.log(`feedIndex > lastReadIndex | ${feedIndex} > ${state.readIndex}`);
      console.log('Time: ', time);
      setTime(() => Date.now());
    }
  }
  
  // Reads a single message, and will also save the messages to localStorage
  async function readNextMessage() {
    console.log('read with index ', state.readIndex);
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
    let message: MessageData | null = null;
    
    do {
      message = await readSingleMessage(state.readIndex, roomId, feedDataForm.address.value);
      if (!message) {
        console.error('Error reading message! Retrying...');
        //sleep(1000);
        //continue;
        return;
      }
      
      if (message.message) {
        //setReadIndex(readIndex+1); Last                                 // Read was successful, but we don't know yet if it's duplicate or not
        const isDuplicate = state.messages.some((msg) => msg.timestamp === message!.timestamp);
        if (isDuplicate) {
          // We won't insert this message, but lastReadIndex was already incremented
          console.log('Duplicate!');
          dispatch({ type: 'incrementReadIndex' });
          return;
        }
        
        dispatch({
          type: 'insertMessage',
          message: message,
          index: state.readIndex,
        });
        dispatch({ type: 'incrementReadIndex' });
        setTime(() => Date.now());
        console.log('messages: ', state.messages);

        // const uniqMessages = removeDuplicate([...messages, message]);       // Remove duplicate messages (by timestamp)
        // const orderedMessages = orderMessages(uniqMessages);                // Order the messages, by timestamp
        // setMessages(orderedMessages);                                       // Show the messages in the app
        saveMessages(feedDataForm.topic.value, state.messages); // Save the messages to LocalStorage
      }
    } while (!message);
  }

  return (
    <LayoutContext.Provider value={{ chatBodyHeight, setChatBodyHeight }}>
      <div className="chat">
        <div>
          <div className="header">
            {!isEditMode && <span>Nickname: {nickname}</span>}
            {isEditMode && (
              <TextInput
                className="set-name"
                value={nickname}
                name={'Nickname'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
                placeholder="Choose a nickname"
              />
            )}
            <button onClick={() => setIsEditMode(!isEditMode)}>
              <EditIcon />
            </button>
          </div>

          <div className="body">
            {state.messages.map((m: MessageData, i: number) => {
              if (!m) return <Message key={i} name={"admin"} message={"loading"} own={false} />
              else return <Message key={i} name={m.name} message={m.message} own={nickname == m.name} />
            })}
          </div>
        </div>

        <Controls topic={feedDataForm.topic.value} nickname={nickname} stamp={feedDataForm.stamp.value} />
      </div>
    </LayoutContext.Provider>
  );
}

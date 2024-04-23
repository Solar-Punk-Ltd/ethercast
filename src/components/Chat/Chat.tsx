import { useEffect, useReducer, useState, createContext, useContext } from 'react';
import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';

export const LayoutContext = createContext({
  chatBodyHeight: '79vh',
  setChatBodyHeight: (_: string) => {},
});

interface ChatProps {
  feedDataForm: Record<string, any>;
}
export const LayoutContext = React.createContext({ chatBodyHeight: 'auto', setChatBodyHeight: (_: string) => {} });

export function Chat({ feedDataForm }: ChatProps) {
  // const { chatBodyHeight } = useContext(LayoutContext);
  const initialState: ChatState = {
    messages: loadMessages(feedDataForm.topic.value),
    readIndex: loadMessages(feedDataForm.topic.value).length,
  };
  const [state, dispatch] = useReducer(messagesReducer, initialState);
  const [initialized, setInitialized] = useState(false);
  const [chatBodyHeight, setChatBodyHeight] = useState('680px');
  const [nickname, setNickname] = useState('tester'); // Our name
  const readInterval = 1000;
  const [isEditMode, setIsEditMode] = useState(false);
  // Load the messages from Swarm
  if (!initialized) init();

  // Set a timer, to check for new messages
  useEffect(() => {
    if (initialized) {
      const messageChecker = setInterval(async () => {
        await checkForMessages();
      }, readInterval);
      return () => clearInterval(messageChecker);
    }
  }, [initialized]);
  const [chatBodyHeight, setChatBodyHeight] = useState('auto');

  useEffect(() => {
    lastReadIndexRef.current = lastReadIndex;
  }, [lastReadIndex]);

  // Init the chat application
  async function init() {
    console.time('init');
    setInitialized(true);
    await readMessagesOnLoad();
    console.timeEnd('init');
  }

  // Reads a single message, and will also save the messages to localStorage
  async function readNextMessage() {
    //console.log("processing message with index: " + (lastReadIndexRef.current+1));
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
    const message = await readSingleMessage(lastReadIndexRef.current + 1, roomId);
    //console.log("message received", message);

    if (message.message) {
      setMessages((prevState) => [...prevState, message]);
      saveMessages(feedDataForm.topic.value, messages);
      setLastReadIndex((state) => state + 1);
    }
  }

  // Reads those messags from Swarm, that does not exist in localStorage
  async function readMessagesOnLoad() {
    // Vissza e
    // console.log('feed is retrievable'); // we are not doing this check, probably we should do this check
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
    const feedIndex: number = Number(await getUpdateIndex(roomId));

    for (let i = messages.length - 1; i < feedIndex; i++) {
      const message = await readSingleMessage(i + 1, roomId);
      setMessages((prevState) => {
        let resultingArray = [...prevState];
        resultingArray[i] = message;
        return resultingArray;
      });
      saveMessages(feedDataForm.topic.value, messages);
    }

    setLastReadIndex(feedIndex);
  }

  // Will update feedIndex, will do message fetch as well, if feed index changed.
  async function checkForMessages() {
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);

    const feedIndex: number = Number(await getUpdateIndex(roomId));
    setLastReadIndex((prevState) => prevState);
    //Vissza e
    // console.log('feedIndex > lastReadIndex', feedIndex, lastReadIndexRef.current);
    if (feedIndex > lastReadIndexRef.current) {
      await readNextMessage();
    }
  }

  return (
    <LayoutContext.Provider
      value={{
        chatBodyHeight,
        setChatBodyHeight,
      }}
    >
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

          <div style={{ maxHeight: chatBodyHeight }} className="body">
            {state.messages.map((m: MessageData, i: number) => (
              <Message key={i} name={m.name} message={m.message} own={nickname == m.name} />
            ))}
          </div>
        </div>

        <Controls topic={feedDataForm.topic.value} nickname={nickname} stamp={feedDataForm.stamp.value} />
      </div>
    </LayoutContext.Provider>
  );
}

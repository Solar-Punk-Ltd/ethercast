import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';

import './Chat.scss';
import { useEffect, useRef, useState } from 'react';
import { MessageData, RoomID, generateRoomId, getUpdateIndex, readSingleMessage } from '../../libs/chat';
import { TextInput } from '../TextInput/TextInput';
import { loadMessages, saveMessages } from '../../utils/chat';

interface ChatProps {
  feedDataForm: Record<string, any>;
}


export function Chat({feedDataForm}: ChatProps) {
  const [messages, setMessages] = useState<MessageData[]>(                              // Load messages from localStorage
    loadMessages(feedDataForm.topic.value)
  );
  const [lastReadIndex, setLastReadIndex] = useState(messages.length || -1);
  const lastReadIndexRef = useRef(lastReadIndex);
  const [initialized, setInitialized] = useState(false);
  const [nickname, setNickname] = useState("tester");   // Our name
  const readInterval = 1000;

  // Load the messages from Swarm
  if (!initialized) init();

  // Set a timer, to check for new messages
  useEffect(() => {
    if (initialized) {
      const messageChecker = setInterval(async () => {
        await checkForMessages();
      }, readInterval);
      return () =>  clearInterval(messageChecker);
    }
  }, [initialized]);

  useEffect(() => {
    lastReadIndexRef.current = lastReadIndex
  }, [lastReadIndex])
  
  // Init the chat application
  async function init() {
    console.time("init")
    setInitialized(true)
    await readMessagesOnLoad();
    console.timeEnd("init")
  }

  // Reads a single message, and will also save the messages to localStorage
  async function readNextMessage() {
    //console.log("processing message with index: " + (lastReadIndexRef.current+1));
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
    const message = await readSingleMessage(lastReadIndexRef.current+1, roomId);
    //console.log("message received", message);

    if (message.message) {
      setMessages((prevState) => [...prevState, message]);
      saveMessages(feedDataForm.topic.value, messages);
      setLastReadIndex((state) => state + 1);
    }
  }

  // Reads those messags from Swarm, that does not exist in localStorage
  async function readMessagesOnLoad() {
    console.log("feed is retrievable");   // we are not doing this check, probably we should do this check
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);    
    const feedIndex: number = Number(await getUpdateIndex(roomId));

    for (let i = messages.length; i < feedIndex; i++) {
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
  async function checkForMessages(){
    const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
    
    const feedIndex: number = Number(await getUpdateIndex(roomId));
    setLastReadIndex((prevState) => prevState);
    console.log("feedIndex > lastReadIndex", feedIndex, lastReadIndexRef.current)
    if (feedIndex > lastReadIndexRef.current) {
        await readNextMessage();
    }
  }

  return (
    <div className="chat">
      <div className="header">
        <TextInput
          className='set-name'
          value={nickname}
          name={"Nickname"}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname (e.target.value)}
        />
        
      </div>  
      
      <div className="body">
        {messages.map((m: MessageData, i: number) => (
          <Message key={i} name={m.name} message={m.message} own={nickname === m.name} />
        ))}
      </div>

      <Controls
        topic={feedDataForm.topic.value}  
        nickname={nickname}
        stamp={feedDataForm.stamp.value}
      />
    </div>
  );
}
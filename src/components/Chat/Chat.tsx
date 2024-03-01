import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';

import './Chat.scss';
import { useEffect, useRef, useState } from 'react';
import { MessageData, createRoom, getFeedActualUpdateIndex, readSingleMessage } from '../../utils/chat';

interface ChatProps {
  topic: string;
}

  
export function Chat({topic}: ChatProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [lastReadIndex, setLastReadIndex] = useState(Number(localStorage.getItem('lastReadIndex')) || -1);
  const lastReadIndexRef = useRef(lastReadIndex);
  //const [feedIndex, setFeedIndex] = useState(-1);
  const [initialized, setInitialized] = useState(false);
  const [nickname, setNickname] = useState("tester");   // Our name
  const readInterval = 1000;

  useEffect(() => {
    init();
  }, [topic]);

  useEffect(() => {
    if (initialized) {
      const messageChecker = setInterval(async () => {
        await readNewMessage();
      }, readInterval);
      return () =>  clearInterval(messageChecker);
    }
  }, [initialized]);

  useEffect(() => {
    lastReadIndexRef.current = lastReadIndex
  }, [lastReadIndex])
  
  // Init the chat application
  async function init() {
    await createRoom(topic);
    //const currentIndex = Number(await getFeedActualUpdateIndex(topic));
    //setFeedIndex(currentIndex);
    await readNextMessage();
    await readMessagesOnLoad();
    setNickname("Peter");
  }



  function saveMessages() {
    /*
    console.log("saving messages")
    let messages = JSON.parse(localStorage.getItem('messages') || '{}');
    messages[this.state.hash] = messages;
    localStorage.setItem('messages', JSON.stringify(messages));
    let chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chatIndex = chats.findIndex((chat) => chat.hash === this.state.hash);
    if (chatIndex > -1) {
        chats[chatIndex].lastReadIndex = this.lastReadIndex;
        localStorage.setItem('chats', JSON.stringify(chats));
    }
    console.log("messages saved")
    */
  }

  async function readNextMessage() {
    console.log("processing message with index: " + (lastReadIndexRef.current+1));
    const message = await readSingleMessage(topic, lastReadIndexRef.current+1);
    console.log("message received", message);

    if (message.message) {
      setMessages((prevState) => [...prevState, message]);
      saveMessages();
      setLastReadIndex((state) => state + 1);
    }
  }

  async function readMessagesOnLoad() {
    console.log("called readMessagesOnLoad");
    console.log("feed is retrievable");   // we are not doing this check
    
    const feedIndex: number = Number(await getFeedActualUpdateIndex(topic));
    console.log("FEEDINDEX: ", feedIndex)
    console.log(feedIndex, lastReadIndexRef.current);
    for (let i = lastReadIndexRef.current; i < feedIndex; i++) {
      console.log("processing message with index: " + (i + 1));
      const message = await readSingleMessage(topic, i + 1);
      console.log("message received", message);
      setMessages((prevState) => [...prevState, message]);
      saveMessages();
      
    }
    //while (feedIndex > lastReadIndex) {
      //}
      
    setLastReadIndex(feedIndex);
    setInitialized(true); 
  }

  async function readNewMessage(){
    console.log("checking for new messages");
    
    const feedIndex: number = Number(await getFeedActualUpdateIndex(topic));
    setLastReadIndex((prevState) => prevState);
    console.log("feedIndex > lastReadIndex", feedIndex, lastReadIndexRef.current)
    if (feedIndex > lastReadIndexRef.current) {
        await readNextMessage();
    }
  }


  return (
    <div className="chat">
      {/* <div className="header">MESSAGES</div> */}
      <div className="body">
        {messages.map((m: MessageData, i: number) => (
          <Message key={i} name={m.name} message={m.message} own={nickname === m.name} />
        ))}
      </div>
      <Controls topic={topic} nickname={nickname} setNickname={setNickname}/>
    </div>
  );
}

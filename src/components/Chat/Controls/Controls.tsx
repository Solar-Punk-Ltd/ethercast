import { useState, useContext, useEffect } from 'react';
import './Controls.scss';
import { RoomID, checkUploadResult, readSingleMessage, sendMessage } from '../../../libs/chat';
import { BatchId, Reference } from '@solarpunk/bee-js';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { Categories, EmojiClickData, Theme } from 'emoji-picker-react';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { ChatInput } from './ChatInput/ChatInput';
import { generateRoomId } from '../../../utils/chat';
import { sleep } from '../../../utils/common';
// import { LayoutContext } from '../Chat';

interface ControlsProps {
  topic: string;
  nickname: string;
  stamp: BatchId;
}

export function Controls({ topic, nickname, stamp }: ControlsProps) {
  const [showIcons, setShowIcons] = useState(false);
  const [height, setHeight] = useState('37px');
  const [sendActive, setSendActive] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  // const { setChatBodyHeight } = useContext(LayoutContext);
  function handleSmileyClick() {
    setShowIcons(!showIcons);
  }
  const roomId: RoomID = generateRoomId(topic);

  async function handleSubmit() {
    if (newMessage === '') return;
    setSendActive(false);
    const messageTimestamp = Date.now();  // It's important to put timestamp here, and not inside the send function because that way we couldn't filter out duplicate messages.
    let result: Reference | number = -1;
    let success = false;

    while (!success) {
      result = await sendMessage(newMessage, nickname, roomId, messageTimestamp, stamp);
      sleep(2000);
      if (result != -1) {
        console.log("Check.")
        checkUploadResult(result as Reference);
      }
      console.log('Send result: ', result);
    }

    setNewMessage('');
    setSendActive(true);
  }

  function handleKeyPress(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
      setHeight('37px');
      // setChatBodyHeight('auto');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    // alert(e.target.value);
    setNewMessage(e.target.value);
    const charsCount = e.target.value.length;
    if (charsCount <= 54) {
      setHeight('37px');
    } else if (charsCount > 54) {
      setHeight(`${Math.ceil(charsCount / 27) * 18}px`);
      // setChatBodyHeight('10px');
    }
  }

  function onEmojiClick(emojiData: EmojiClickData) {
    setNewMessage((prev) => prev + emojiData.emoji);
  }

  return (
    <div style={{ height }} className="controls">
      <ChatInput
        className="chat-input"
        value={newMessage}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(e)}
        onKeyPress={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyPress(e)}
        name={nickname}
        placeholder={'Type your message here'}
      />
      {showIcons && (
        <div className="text-input-icons">
          <EmojiPicker
            previewConfig={{ showPreview: false }}
            onEmojiClick={(emoji: EmojiClickData) => onEmojiClick(emoji)}
            width="100%"
            theme={Theme.DARK}
            categories={[
              { category: Categories.SUGGESTED, name: 'suggested' },
              { category: Categories.SMILEYS_PEOPLE, name: 'Smileys & People' },
              { category: Categories.ANIMALS_NATURE, name: 'Animal & Nature' },
              { category: Categories.FOOD_DRINK, name: 'Food & Drink' },
              { category: Categories.TRAVEL_PLACES, name: 'Travel & Places' },
              { category: Categories.ACTIVITIES, name: 'Activities' },
              { category: Categories.OBJECTS, name: 'Objects' },
              { category: Categories.SYMBOLS, name: 'Symbols' },
              { category: Categories.FLAGS, name: 'Flags' },
            ]}
          />
        </div>
      )}
      <SentimentSatisfiedAltIcon className="text-input-icon" onClick={handleSmileyClick} />
      <button onClick={handleSubmit} className="sendButton">
        <SendIcon />
      </button>
    </div>
  );
}
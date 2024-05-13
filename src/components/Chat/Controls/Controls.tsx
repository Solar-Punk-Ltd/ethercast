import { useState } from 'react';
import './Controls.scss';
import { RoomID, checkUploadResult, readSingleMessage, sendMessage } from '../../../libs/chat';
import { BatchId, Reference } from '@solarpunk/bee-js';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { Categories, EmojiClickData, Theme } from 'emoji-picker-react';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { ChatInput } from './ChatInput/ChatInput';
import { generateRoomId } from '../../../utils/chat';
import { sleep } from '../../../utils/common';
import CircularProgress from '@mui/material/CircularProgress';

interface ControlsProps {
  topic: string;
  streamerAddress: EthAddress;
  nickname: string;
  stamp: BatchId;
  newUnseenMessages?: boolean;
}

export function Controls({ topic, nickname, stamp }: ControlsProps) {
  const [showIcons, setShowIcons] = useState(false);
  const [sendActive, setSendActive] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  function handleSmileyClick() {
    setShowIcons(!showIcons);
  }
  const roomId: RoomID = generateRoomId(topic);

  async function handleSubmit() {
    if (newMessage === '') return;
    setSendActive(true);
    setShowIcons(false);
    const messageTimestamp = Date.now(); // It's important to put timestamp here, and not inside the send function because that way we couldn't filter out duplicate messages.
    let result: Reference | number = await sendMessage(newMessage, nickname, roomId, messageTimestamp, stamp);
    let success = false;
    let counter = 0;

    while (!success) {
      setSendActive(true);
      if (counter > 32) {
        counter = 0;
        result = await sendMessage(newMessage, nickname, roomId, messageTimestamp, stamp);
      }

      if (result != -1) {
        success = await checkUploadResult(result as Reference);
      }

      counter++;
      await sleep(2000);
    }

    setNewMessage('');
    setSendActive(false);
  }

  function handleKeyPress(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
      setNewMessage('');
    }
  }

  function onEmojiClick(emojiData: EmojiClickData) {
    setNewMessage((prev) => prev + emojiData.emoji);
  }

  return (
    <div className="controls">
      <ChatInput
        className="chat-input"
        value={newMessage}
        onKeyPressed={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyPress(e)}
        setValue={setNewMessage}
        name={nickname}
        disabled={sendActive}
        placeholder={'Type your message here'}
        textareaClassName={sendActive}
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

      {!sendActive ? (
        <SentimentSatisfiedAltIcon
          sx={{ cursor: sendActive ? 'not-allowed' : '' }}
          className="text-input-icon"
          onClick={handleSmileyClick}
        />
      ) : null}

      <div className="controlButton">
        <button
          onClick={handleSubmit}
          className="sendButton"
          style={{ cursor: sendActive ? 'not-allowed' : '' }}
          disabled={sendActive}
        >
          {sendActive ? <CircularProgress size={20} sx={{ color: '#ff7900' }} /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}
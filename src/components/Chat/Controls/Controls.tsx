import { useState } from 'react';
import { BatchId } from '@ethersphere/bee-js';
import SendIcon from '@mui/icons-material/Send';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import CircularProgress from '@mui/material/CircularProgress';
import { useEthers } from '@usedapp/core';
import EmojiPicker, { Categories, EmojiClickData, Theme } from 'emoji-picker-react';

import { ChatInput } from './ChatInput/ChatInput';

import './Controls.scss';
import { EthAddress, MessageData, sendMessage, ParticipantDetails, IDLE_TIME } from '../../../libs/chat';

interface ControlsProps {
  privateKey: string;
  topic: string;
  nickname: string;
  stamp: BatchId;
  reJoin: (participantDetails: ParticipantDetails) => Promise<void>;
}

export function Controls({ topic, nickname, stamp, privateKey, reJoin }: ControlsProps) {
  const { account } = useEthers();

  const [showIcons, setShowIcons] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [lastMessageSent, setLastMessageSent] = useState(0);                  // Timestamp of last message that we sent

  function handleSmileyClick() {
    setShowIcons(!showIcons);
  }

  async function handleSubmit() {
    const now = Date.now();

    if (lastMessageSent + IDLE_TIME < now) {
      if (!account) throw 'Could not get Eth address';
      const details: ParticipantDetails = {
        nickName: nickname,
        stamp: stamp,
        participant: account,
        key: privateKey
      }
      console.info("Rejoining chat...");
      await reJoin(details);
      console.info("Rejoined chat!");
    }
    if (newMessage === '' || isSendingMessage || !account) return;
    setIsSendingMessage(true);
    setShowIcons(false);
    setLastMessageSent(now);

    const messageObj: MessageData = {
      address: account as EthAddress,
      message: newMessage,
      username: nickname,
      timestamp: now,
    };

    const result = await sendMessage(account as EthAddress, topic, messageObj, stamp, privateKey);
    if (!result) throw 'Could not send message!';

    setNewMessage('');
    setIsSendingMessage(false);
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
        disabled={isSendingMessage}
        placeholder={'Type your message here'}
        textareaClassName={isSendingMessage}
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

      {!isSendingMessage && (
        <SentimentSatisfiedAltIcon
          sx={{ cursor: isSendingMessage ? 'not-allowed' : '' }}
          className="text-input-icon"
          onClick={handleSmileyClick}
        />
      )}

      <div className="send-wrapper">
        <button
          onClick={handleSubmit}
          className="send-button"
          style={{ cursor: isSendingMessage ? 'not-allowed' : '' }}
          disabled={isSendingMessage}
        >
          {isSendingMessage ? <CircularProgress size={20} sx={{ color: '#ff7900' }} /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { TextInput } from '../../TextInput/TextInput';
import './Controls.scss';
import { RoomID, generateRoomId, sendMessage } from '../../../libs/chat';
import { BatchId } from '@ethersphere/bee-js';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';

interface ControlsProps {
  topic: string;
  nickname: string;
  stamp: BatchId;
}

export function Controls({ topic, nickname, stamp }: ControlsProps) {
  const [showIcons, setShowIcons] = useState(false);
  function handleSmileyClick() {
    setShowIcons(!showIcons);
  }
  const [newMessage, setNewMessage] = useState('');
  const roomId: RoomID = generateRoomId(topic);

  async function handleSubmit() {
    const result = await sendMessage(newMessage, nickname, roomId, stamp);
    console.log('Send result: ', result);
    setNewMessage('');
  }

  function handleKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }

  function onEmojiClick(emojiData: EmojiClickData, event: React.MouseEvent<HTMLButtonElement>) {
    setNewMessage(newMessage + emojiData.emoji);
  }

  return (
    <div className="controls">
      <TextInput
        className="chat-input"
        value={newMessage}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
        onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyPress(e)}
        name={nickname}
        placeholder={'Type your message here'}
        icon={true}
      />
      {showIcons && (
        <div className="text-input-icons">
          <EmojiPicker
            previewConfig={{ showPreview: true }}
            onEmojiClick={onEmojiClick}
            emojiSize={10}
            showPreview={true}
            width="100%"
            theme="dark"
            categories={[
              { category: 'suggested', name: 'suggested' },
              { category: 'smileys_people', name: 'Smileys & People' },
              { category: 'animals_nature', name: 'Animal & Nature' },
              { category: 'food_drink', name: 'Food & Drink' },
              { category: 'travel_places', name: 'Travel & Places' },
              { category: 'activities', name: 'Activities' },
              { category: 'objects', name: 'Objects' },
              { category: 'symbols', name: 'Symbols' },
              { category: 'flags', name: 'Flags' },
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

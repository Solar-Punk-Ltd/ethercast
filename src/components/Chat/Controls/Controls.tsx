import { useState } from 'react';
import { TextInput } from '../../TextInput/TextInput';
import './Controls.scss';
import { RoomID, generateRoomId, sendMessage } from '../../../libs/chat';
import { BatchId } from '@ethersphere/bee-js';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { Categories, EmojiClickData, Theme } from 'emoji-picker-react';
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

  // useEffect(() => {
  //   console.log('NewMessage', newMessage);
  // }, [newMessage]);

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

  function onEmojiClick(emojiData: EmojiClickData) {
    setNewMessage((prev) => prev + emojiData.emoji);
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

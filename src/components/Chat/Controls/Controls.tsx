import { useState } from 'react';
import { TextInput } from '../../TextInput/TextInput';
import './Controls.scss';
import { RoomID, generateRoomId, sendMessage } from '../../../libs/chat';
import { BatchId } from '@ethersphere/bee-js';
import SendIcon from '@mui/icons-material/Send';

interface ControlsProps {
  topic: string;
  nickname: string;
  stamp: BatchId;
}

export function Controls({ topic, nickname, stamp }: ControlsProps) {
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
      <button onClick={handleSubmit}>
        <SendIcon />
      </button>
    </div>
  );
}

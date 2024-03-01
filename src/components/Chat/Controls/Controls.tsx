import { useState } from 'react';
import { TextInput } from '../../TextInput/TextInput';
import { sendMessage } from '../../../utils/chat';
import './Controls.scss';

interface ControlsProps {
  topic: string;
  nickname: string;
  setNickname: (name: string) => void;
}

export function Controls({topic, nickname, setNickname}: ControlsProps) {
  const [newMessage, setNewMessage] = useState("");
  const [newName, setNewName] = useState(nickname);

  async function handleSubmit() {
    const result = await sendMessage(topic, newMessage, nickname);
    console.log("Send result: ", result);
    setNewMessage("");
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
        placeholder={"Type your message here"}
      />
      <button onClick={handleSubmit}>
        {"→"}
      </button>
      {false && <div>
        <TextInput
        className='set-name'
        value={newName}
        name={"Nickname"}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
      />
      <button></button>
      <button onClick={() => setNickname(newName)}>Set</button>
      </div>}
    </div>
  );
}

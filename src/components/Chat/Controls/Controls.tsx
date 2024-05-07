import { useState } from 'react';
import './Controls.scss';
import { EthAddress, MessageData, writeToOwnFeed } from '../../../libs/chat';
import { BatchId } from '@solarpunk/bee-js';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { Categories, EmojiClickData, Theme } from 'emoji-picker-react';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { ChatInput } from './ChatInput/ChatInput';
import { ChatAction, ChatActions, State } from '../../../libs/chatUserSide';
import { generateUniqId } from '../../../utils/chat';

interface ControlsProps {
  topic: string;
  streamerAddress: EthAddress;
  nickname: string;
  stamp: BatchId;
  state: State;
  dispatch: React.Dispatch<ChatAction>;
}

export function Controls({ topic, streamerAddress, nickname, stamp, state, dispatch }: ControlsProps) {
  const [showIcons, setShowIcons] = useState(false);
  // const [height, setHeight] = useState('37px');
  const [sendActive, setSendActive] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  // const [controlHeight, setControlHeight] = useState('37px');
  // const { setChatBodyHeight } = useContext(LayoutContext);
  function handleSmileyClick() {
    setShowIcons(!showIcons);
  }

  async function handleSubmit() {
    if (newMessage === '' || !sendActive) return;
    setSendActive(false);
    const messageTimestamp = Date.now(); // It's important to put timestamp here, and not inside the send function because that way we couldn't filter out duplicate messages.

    const userAddress: EthAddress | null = localStorage.getItem(generateUniqId(topic, streamerAddress)) as EthAddress;
    if (!userAddress) throw "Could not get address from local storage!"                       // This suggests that the user haven't registered yet for this chat
    
    const messageObj: MessageData = {
      message: newMessage,
      username: nickname,
      address: userAddress,
      timestamp: messageTimestamp,
    };
    
    const result = await writeToOwnFeed(topic, streamerAddress, state.ownFeedIndex, messageObj, stamp);
    if (!result) throw 'Could not send message!';
    dispatch({ type: ChatActions.UPDATE_OWN_FEED_INDEX, payload: { ownFeedIndex: state.ownFeedIndex + 1 } });


    setNewMessage('');
    setSendActive(true);
  }

  function handleKeyPress(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
      setNewMessage('');
      // setHeight('37px');
      // setChatBodyHeight('auto');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    // alert(e.target.value);
    // setNewMessage(e.target.value);
    // const charsCount = e.target.value.length;
    // if (charsCount <= 54) {
    //   setHeight('37px');
    // } else if (charsCount > 54) {
    //   setHeight(`${Math.ceil(charsCount / 27) * 18}px`);
    //   // setChatBodyHeight('10px');
    // }
  }

  function onEmojiClick(emojiData: EmojiClickData) {
    setNewMessage((prev) => prev + emojiData.emoji);
  }

  return (
    <div className="controls">
      <ChatInput
        className="chat-input"
        value={newMessage}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(e)}
        onKeyPressed={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyPress(e)}
        setValue={setNewMessage}
        // setControlHeight={setControlHeight}
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
      <div className="controlButton">
        <button onClick={handleSubmit} className="sendButton">
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
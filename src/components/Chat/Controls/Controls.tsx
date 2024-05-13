import { useState } from 'react';
import { EthAddress, MessageData, writeToOwnFeed } from '../../../libs/chat';
import { BatchId } from '@ethersphere/bee-js';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { Categories, EmojiClickData, Theme } from 'emoji-picker-react';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { ChatAction, ChatActions, State } from '../../../libs/chatUserSide';
import { generateUniqId } from '../../../utils/chat';
import { ChatInput } from './ChatInput/ChatInput';
import CircularProgress from '@mui/material/CircularProgress';
import './Controls.scss';

interface ControlsProps {
  topic: string;
  streamerAddress: EthAddress;
  nickname: string;
  stamp: BatchId;
  state: State;
  dispatch: React.Dispatch<ChatAction>;
  newUnseenMessages?: boolean;
}

export function Controls({ topic, streamerAddress, nickname, stamp, state, dispatch }: ControlsProps) {
  const [showIcons, setShowIcons] = useState(false);
  const [sendActive, setSendActive] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  function handleSmileyClick() {
    setShowIcons(!showIcons);
  }
    
  async function handleSubmit() {
    if (newMessage === '' || sendActive) return;
    setSendActive(true);
    setShowIcons(false);
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
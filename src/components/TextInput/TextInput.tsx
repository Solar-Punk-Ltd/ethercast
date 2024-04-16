import React from 'react';
import clsx from 'clsx';

import './TextInput.scss';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import EmojiPicker from 'emoji-picker-react';

interface TextInputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  className?: string;
  value: string | number;
  name: string;
  icon?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function TextInput({ label, icon, ...props }: TextInputProps) {
  const [showIcons, setShowIcons] = React.useState(false);
  function handleSmileyClick() {
    setShowIcons(!showIcons);
  }
  return (
    <div className={clsx('text-input-container')}>
      {label && <label className="text-input-label">{label}</label>}
      {/* {showIcons && (
        <div className="text-input-icons">
          <EmojiPicker
            previewConfig={{ showPreview: true }}
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
      )} */}
      <input className="text-input-field" {...props} />
      {/* {icon && <SentimentSatisfiedAltIcon className="text-input-icon" onClick={handleSmileyClick} />} */}
    </div>
  );
}

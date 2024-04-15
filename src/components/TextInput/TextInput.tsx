import React from 'react';
import clsx from 'clsx';

import './TextInput.scss';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';

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
      {showIcons && (
        <div className="text-input-icons">
          <SentimentSatisfiedAltIcon />
          <SentimentSatisfiedAltIcon />
          <SentimentSatisfiedAltIcon />
        </div>
      )}
      <input className="text-input-field" {...props} />
      {icon && <SentimentSatisfiedAltIcon className="text-input-icon" onClick={handleSmileyClick} />}
    </div>
  );
}

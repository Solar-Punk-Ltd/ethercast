import React, { useState } from 'react';
import clsx from 'clsx';

import './ChatInput.scss';

interface ChatInputProps {
  label?: string;
  placeholder?: string;
  className?: string;
  value: string;
  name: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({ label, value, ...props }: ChatInputProps) {
  const [lineHeight, setLineHeight] = useState('37px');
  const [height, setHeight] = useState('37px');

  const handleInput = (e: any) => {
    // alert(e.target.value.length);
    const charsCount = e.target.value.length;
    if (charsCount <= 27) {
      setLineHeight('37px');
      setHeight('37px');
    } else if (charsCount > 27 && charsCount <= 54) {
      setLineHeight('16px');
      setHeight('37px');
    } else if (charsCount > 54) {
      setLineHeight('16px');
      setHeight(`${Math.ceil(charsCount / 27) * 18}px`);
    }
  };
  return (
    <div className={clsx('chat-textarea-container')}>
      {label && <label className="textarea-label">{label}</label>}

      <textarea
        value={value}
        style={{ lineHeight, height }}
        className="textarea-field"
        {...props}
        onInput={(e) => handleInput(e)}
      />
    </div>
  );
}

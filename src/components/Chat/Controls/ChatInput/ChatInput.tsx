import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import TextField from '@mui/material/TextField';

import './ChatInput.scss';

interface ChatInputProps {
  label?: string;
  placeholder?: string;
  className?: string;
  setValue?: any;
  value: string;
  name: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({ label, value, setValue, ...props }: ChatInputProps) {
  // const [height, setHeight] = useState('37px');
  const textFieldRef = useRef(null);

  // const handleInput = (e: any) => {
  //   // alert(e.target.value.length);
  //   const charsCount = e.target.value.length;
  //   if (charsCount <= 27) {
  //     setLineHeight('37px');
  //     setHeight('37px');
  //   } else if (charsCount > 27 && charsCount <= 54) {
  //     setLineHeight('16px');
  //     setHeight('37px');
  //   } else if (charsCount > 54) {
  //     setLineHeight('16px');
  //     setHeight(`${Math.ceil(charsCount / 27) * 18}px`);
  //   }
  // };
  return (
    <>
      {label && <label className="textarea-label">{label}</label>}

      <TextField
        ref={textFieldRef}
        multiline={true}
        value={value}
        sx={{
          width: '100%',
          maxHeight: '120px',
          overflow: 'auto',
          backgroundColor: 'white',
          '& .MuiOutlinedInput-root': {
            borderRadius: '0px',
            padding: '7px',
            paddingRight: '35px',
            '&.Mui-focused fieldset': {
              border: '1px solid #1b0900',
            },
          },
          '& .MuiInputBase-input': {
            fontSize: '14px',
            fontFamily: 'iAWriterQuattroV',
          },
          '& .MuiInputBase-input::placeholder': {
            fontSize: '14px',
          },
        }}
        className="textarea-field"
        placeholder={'Type your message here'}
        // {...props}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setValue(e.target.value);
        }}
      />
    </>
  );
}

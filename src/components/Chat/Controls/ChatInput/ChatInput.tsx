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
  onKeyPressed: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({ label, value, setValue, onKeyPressed, ...props }: ChatInputProps) {
  const textFieldRef = useRef(null);
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
        inputProps={{
          onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onKeyPressed(e);
            }
          },
        }}
      />
    </>
  );
}

import React, { useRef } from 'react';
import TextField from '@mui/material/TextField';

import './ChatInput.scss';

interface ChatInputProps {
  label?: string;
  placeholder?: string;
  className?: string;
  setValue?: any;
  value: string;
  disabled?: boolean;
  name: string;
  textareaClassName: boolean;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPressed: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

// TODO: we don't want to use MUI --> create your own or extend the existing TextInput
export function ChatInput({ label, value, disabled, setValue, textareaClassName, onKeyPressed }: ChatInputProps) {
  const textFieldRef = useRef(null);
  return (
    <>
      {label && <label className="textarea-label">{label}</label>}

      <TextField
        ref={textFieldRef}
        disabled={disabled}
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
          '& .MuiInputBase-root .Mui-disabled': {
            backgroundColor: textareaClassName ? 'grey' : 'white',
            cursor: 'not-allowed',
          },
          '& .MuiInputBase-root': {
            backgroundColor: textareaClassName ? 'grey' : 'white',
            cursor: textareaClassName ? 'not-allowed' : '',
          },
        }}
        placeholder={'Type your message here'}
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

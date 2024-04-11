import React from 'react';
import clsx from 'clsx';

import './TextInput.scss';

interface TextInputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  className?: string;
  value: string | number;
  name: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function TextInput({ label, ...props }: TextInputProps) {
  return (
    <div className={clsx('text-input-container', props.className)}>
      {label && <label className="text-input-label">{label}</label>}
      <input className="text-input-field" {...props} />
    </div>
  );
}

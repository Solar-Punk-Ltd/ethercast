import React from 'react';

import './TextInput.scss';

interface TextInputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  name: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TextInput({ label, ...props }: TextInputProps) {
  return (
    <div className="text-input-container">
      {label && <label className="text-input-label">{label}</label>}
      <input className="text-input-field" {...props} />
    </div>
  );
}

import { ChangeEvent, ForwardedRef, forwardRef } from 'react';
import { RefCallBack } from 'react-hook-form';
import clsx from 'clsx';

import { InputError } from '../InputError/InputError';

import './TextInput.scss';

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
  return (
    <div className={clsx('text-input-container')}>
      {label && <label className="text-input-label">{label}</label>}

      <input className="text-input-field" {...props} />
    </div>
  );
}

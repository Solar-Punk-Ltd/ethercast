import { ChangeEvent, ForwardedRef, forwardRef } from 'react';
import { RefCallBack } from 'react-hook-form';
import clsx from 'clsx';

import { InputError } from '../InputError/InputError';

import './TextInput.scss';

interface TextInputProps {
  name: string;
  value: string | number;
  label?: string;
  type?: string;
  placeholder?: string;
  className?: string;
  ref?: RefCallBack;
  error?: string;
  disabled?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

function TextInputInternal({ label, error, ...props }: TextInputProps, ref: ForwardedRef<HTMLInputElement>) {
  return (
    <div className={clsx('text-input-container')}>
      {label && <label className="text-input-label">{label}</label>}
      <input className="text-input-field" {...props} ref={ref} />
      {error && <InputError error={error} />}
    </div>
  );
}

export const TextInput = forwardRef(TextInputInternal);

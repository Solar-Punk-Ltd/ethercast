import { Control, Controller } from 'react-hook-form';

import { TextInput } from './TextInput';

interface ControllerTextInputProps {
  name: string;
  rules: {
    required: string;
    validate?: (value: string) => string | true;
  };
  control: Control<any, any>;
  defaultValue: string;
  label: string;
  disabled?: boolean;
}

export function ControllerTextInput({ name, rules, control, defaultValue, label, disabled }: ControllerTextInputProps) {
  return (
    <Controller
      name={name}
      rules={rules}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
        <TextInput
          label={label}
          name={name}
          value={value}
          onChange={onChange}
          ref={ref}
          disabled={disabled}
          error={error?.message}
        />
      )}
    />
  );
}

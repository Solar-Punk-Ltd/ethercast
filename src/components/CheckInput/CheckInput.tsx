import { useState } from 'react';

interface CheckInputProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export function CheckInput({ label, checked, onChange }: CheckInputProps) {
  const [isChecked, setIsChecked] = useState(checked);

  const handleChange = () => {
    setIsChecked(!isChecked);
    onChange();
  };

  return (
    <div>
      <label>
        {label}
        <input type="checkbox" checked={isChecked} onChange={handleChange} />
      </label>
    </div>
  );
}

import { TextInput } from '../../TextInput/TextInput';

import './Controls.scss';

interface ControlsProps {}

export function Controls(_: ControlsProps) {
  return (
    <div className="controls">
      <TextInput className="chat-input" value="test" name="test" />
    </div>
  );
}

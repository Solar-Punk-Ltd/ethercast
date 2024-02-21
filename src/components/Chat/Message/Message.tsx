import clsx from 'clsx';

import './Message.scss';

interface MessageProps {
  name: string;
  message: string;
  own?: boolean;
}

export function Message({ name, message, own }: MessageProps) {
  return (
    <div className="message">
      {!own && <span className="name">{name}:</span>}
      <span className={clsx(own ? 'own' : '')}>{message}</span>
    </div>
  );
}

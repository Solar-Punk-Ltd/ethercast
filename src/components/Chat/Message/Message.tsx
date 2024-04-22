import clsx from 'clsx';

import './Message.scss';

interface MessageProps {
  name: string;
  message: string;
  own?: boolean;
}

export function Message({ name, message, own }: MessageProps) {
  return (
    <>
      {!own && <span className="name">{name}:</span>}
      <div className="message">
        <div className={clsx(own ? 'own' : 'other')}>
          <span>{message}</span>
        </div>
      </div>
    </>
  );
}
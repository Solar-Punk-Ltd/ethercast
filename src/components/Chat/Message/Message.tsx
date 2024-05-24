import clsx from 'clsx';
import './Message.scss';
import ProfilePic from '../../ProfilePic/ProfilePic';
import { State } from '../../../libs/chatUserSide';
import CircularProgress from '@mui/material/CircularProgress';
import { EthAddress } from 'src/libs/chat';

interface MessageProps {
  name: string;
  message: string;
  own?: boolean;
  state?: State;
  alreadySent?: boolean;
  isSending?: boolean;
  address?: EthAddress;
}

export function Message({ name, message, own, isSending, address }: MessageProps) {
  return (
    <>
      <div className="message">
        {!own ? <ProfilePic hash={address} width={22} height={22} marginTop={5} name={name} /> : null}
        <div className={!own ? 'message-with-name' : 'message-without-name'}>
          {!own && <span className="name">{name}:</span>}
          <div className="message-with-indicator">
            <div className={clsx(own ? 'own' : 'other')}>
              <span>{message}</span>
            </div>
            {isSending ? (
              <div className="message-indicator">
                <CircularProgress
                  size={10}
                  sx={{
                    color: '#190029',
                  }}
                />
              </div>
            ) : null}
          </div>
          {own ? <ProfilePic hash={address} width={22} height={22} name={name} /> : null}
        </div>
      </div>
    </>
  );
}

import { Controls } from './Controls/Controls';
import { Message } from './Message/Message';

import './Chat.scss';

interface ChatProps {}

const messages = [
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'Hello there!',
    name: 'Obi-Wan Kenobi',
  },
  {
    message: 'General Kenobi!',
    name: 'General Grievous',
    own: true,
  },
];

export function Chat(_: ChatProps) {
  return (
    <div className="chat">
      <div className="header">Super Swarm chat</div>
      <div className="body">
        {messages.map((m, i) => (
          <Message key={i} name={m.name} message={m.message} own={m.own} />
        ))}
      </div>
      <Controls />
    </div>
  );
}

import { Button, ButtonVariant } from '../Button/Button';

import './JoinButton.scss';

interface JoinButtonProps {
  onClick: () => void;
}

export function JoinButton({ onClick }: JoinButtonProps) {
  return (
    <Button className="join-button" onClick={onClick} variant={ButtonVariant.primary}>
      THIS IS THE MOCK JOIN BUTTON
    </Button>
  );
}

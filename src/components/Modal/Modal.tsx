import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';

import './Modal.scss';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

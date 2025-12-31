// ModalOverlay.tsx
import React, { useEffect } from 'react';

type Props = { onClose: () => void; };

export const ModalOverlay: React.FC<Props> = ({ onClose }) => {
  // Support Esc to close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <button
      type="button"
      aria-label="Close dialog"
      className="fixed inset-0 bg-neutral-900 bg-opacity-50 transition-opacity"
      onClick={onClose}
      // Make button visually behave like a non-button (no borders etc.)
      // but keep native semantics and keyboard support.
    />
  );
};

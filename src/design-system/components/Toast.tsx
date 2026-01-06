import React, { useEffect } from 'react';

export interface ToastProps {
  /** Toast message */
  message: string;
  /** Toast type */
  type?: 'success' | 'error' | 'warning' | 'info';
  /** Whether toast is visible */
  visible: boolean;
  /** Called when toast should close */
  onClose: () => void;
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration?: number;
}

const typeColors = {
  success: '#2e844a',
  error: '#ba1b1b',
  warning: '#dd7a01',
  info: '#066afe',
};

const icons = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

/**
 * Toast Component (SLDS 2 Cosmos Theme)
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  visible,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '12px',
        right: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 500,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: typeColors[type],
        color: 'white',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      <span
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          flexShrink: 0,
        }}
      >
        {icons[type]}
      </span>
      <span style={{ flex: 1 }}>{message}</span>
    </div>
  );
};

Toast.displayName = 'Toast';

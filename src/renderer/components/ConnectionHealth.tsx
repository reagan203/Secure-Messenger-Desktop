import React from 'react';
import { useAppSelector } from '../store/hooks';
import type { ConnectionStatus } from '../store/connectionSlice';

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; bg: string }> = {
  connected: { label: 'Connected', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
  connecting: { label: 'Connecting', color: '#facc15', bg: 'rgba(250, 204, 21, 0.1)' },
  disconnected: { label: 'Disconnected', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
};

const ConnectionHealth: React.FC = () => {
  const { status, lastPing, reconnectAttempts, error } = useAppSelector((s) => s.connection);
  const config = STATUS_CONFIG[status];

  const lastPingText = lastPing
    ? new Date(lastPing).toLocaleTimeString()
    : '--';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      borderRadius: '8px',
      backgroundColor: config.bg,
      border: `1px solid ${config.color}33`,
      fontSize: '13px',
      fontFamily: 'inherit',
    }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: config.color,
        display: 'inline-block',
        boxShadow: status === 'connected' ? `0 0 6px ${config.color}` : 'none',
      }} />
      <span style={{ color: config.color, fontWeight: 600 }}>
        {config.label}
      </span>
      <span style={{ color: '#888', fontSize: '12px' }}>
        Ping: {lastPingText}
      </span>
      {reconnectAttempts > 0 && status !== 'connected' && (
        <span style={{ color: '#facc15', fontSize: '12px' }}>
          Retry #{reconnectAttempts}
        </span>
      )}
      {error && (
        <span style={{ color: '#f87171', fontSize: '12px' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default ConnectionHealth;

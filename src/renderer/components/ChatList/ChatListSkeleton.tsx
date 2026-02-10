import React from 'react';
import Skeleton from '@mui/material/Skeleton';

const ITEM_HEIGHT = 72;
const SKELETON_COUNT = 8;

const ChatListSkeleton: React.FC = () => {
  return (
    <div style={{ flex: 1, padding: '0 12px' }}>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: ITEM_HEIGHT,
            padding: '0 12px',
            gap: '12px',
          }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div style={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatListSkeleton;

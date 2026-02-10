import React from 'react';
import Skeleton from '@mui/material/Skeleton';

const SKELETON_COUNT = 6;
const WIDTHS = [55, 70, 40, 65, 50, 60];

const MessageSkeleton: React.FC = () => {
  return (
    <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => {
        const isRight = i % 3 === 0;
        const width = WIDTHS[i] ?? 55;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isRight ? 'flex-end' : 'flex-start',
            }}
          >
            {!isRight && (
              <Skeleton variant="text" width={80} height={14} sx={{ mb: 0.5, ml: '12px' }} />
            )}
            <Skeleton
              variant="rounded"
              width={`${width}%`}
              height={48}
              sx={{ borderRadius: isRight ? '12px 12px 4px 12px' : '12px 12px 12px 4px' }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MessageSkeleton;

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded'
}) => {
  return (
    <div
      className={`bg-gray-200 ${width} ${height} ${rounded} ${className}`}
      style={{ animation: 'none' }}
    />
  );
};

// Skeleton para texto
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
};

// Skeleton para card
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 ${className}`}>
      <Skeleton width="w-32" height="h-6" className="mb-3" />
      <SkeletonText lines={3} />
    </div>
  );
};

// Skeleton para tabela
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton width="w-20" height="h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-t border-neutral-100">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton width={colIndex === 0 ? 'w-24' : 'w-16'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Skeleton para lista
export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton width="w-32" height="h-5" className="mb-2" />
              <Skeleton width="w-48" height="h-4" />
            </div>
            <Skeleton width="w-20" height="h-8" rounded="rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  title?: string;
  actions?: React.ReactNode;
}

export function Card({
  children,
  className = '',
  noPadding = false,
  title,
  actions
}: CardProps) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          {title && <h3 className="font-medium text-krooa-dark">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardSection({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`border-t border-neutral-200 px-5 py-4 first:border-t-0 ${className}`}>
      {children}
    </div>
  );
}
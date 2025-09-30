import React from 'react';

interface LoadingSpinnerProps {
  type?: 'spinner' | 'pulse' | 'bars' | 'bounce';
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export function LoadingSpinner({
  type = 'spinner',
  size = 'medium',
  text
}: LoadingSpinnerProps) {
  const sizeClass = size === 'small' ? 'spinner-small' : size === 'large' ? 'spinner-large' : '';

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {type === 'spinner' && (
        <div className={`spinner ${sizeClass}`}></div>
      )}

      {type === 'pulse' && (
        <div className="loading-pulse">
          <div className="loading-pulse-dot"></div>
          <div className="loading-pulse-dot"></div>
          <div className="loading-pulse-dot"></div>
        </div>
      )}

      {type === 'bars' && (
        <div className="loading-bars">
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
        </div>
      )}

      {type === 'bounce' && (
        <div className="loading-bounce">
          <div className="loading-bounce-dot"></div>
          <div className="loading-bounce-dot"></div>
          <div className="loading-bounce-dot"></div>
        </div>
      )}

      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );
}

// Função helper para usar com SweetAlert2
export function getSwalLoadingHtml(type: 'spinner' | 'pulse' | 'bars' | 'bounce' = 'bars', text?: string) {
  const animations = {
    spinner: '<div class="spinner"></div>',
    pulse: `
      <div class="loading-pulse">
        <div class="loading-pulse-dot"></div>
        <div class="loading-pulse-dot"></div>
        <div class="loading-pulse-dot"></div>
      </div>
    `,
    bars: `
      <div class="loading-bars">
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
      </div>
    `,
    bounce: `
      <div class="loading-bounce">
        <div class="loading-bounce-dot"></div>
        <div class="loading-bounce-dot"></div>
        <div class="loading-bounce-dot"></div>
      </div>
    `
  };

  return `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
      ${animations[type]}
      ${text ? `<p style="color: #6b7280; font-size: 14px; margin-top: 8px;">${text}</p>` : ''}
    </div>
  `;
}
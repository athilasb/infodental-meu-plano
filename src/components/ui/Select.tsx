import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  floating?: boolean;
}

export function Select({
  label,
  options,
  error,
  helperText,
  fullWidth = false,
  floating = false,
  className = '',
  value,
  ...props
}: SelectProps) {
  const baseClasses = 'rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-krooa-green/20 focus:border-krooa-green transition-all';
  const errorClasses = error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-300';
  const widthClass = fullWidth ? 'w-full' : '';

  if (floating && label) {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <div className="relative">
          <select
            className={`peer w-full rounded-xl border border-gray-300 px-4 pt-5 pb-2 text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-krooa-green/20 focus:border-krooa-green transition-all ${className}`}
            value={value}
            {...props}
          >
            <option value="" disabled>Selecione...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
            value ? 'top-2 text-xs text-gray-600' : 'top-1/2 -translate-y-1/2 text-gray-500'
          } peer-focus:top-2 peer-focus:text-xs peer-focus:text-krooa-green`}>
            {label}
          </label>
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        className={`${baseClasses} ${errorClasses} ${widthClass} ${className}`}
        value={value}
        {...props}
      >
        <option value="" disabled>Selecione...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
}

export function CompactSelect({
  label,
  options,
  error,
  helperText,
  fullWidth = true,
  floating = true,
  className = '',
  value,
  ...props
}: SelectProps) {
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <div className="relative">
        <select
          className={`peer w-full rounded-lg border border-gray-300 px-3 pt-4 pb-1.5 text-sm text-gray-900 placeholder-transparent focus:outline-none focus:ring-1 focus:ring-krooa-green/20 focus:border-krooa-green transition-all ${
            error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''
          } ${className}`}
          value={value}
          {...props}
        >
          <option value="" disabled>Selecione...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className={`absolute left-3 transition-all duration-200 pointer-events-none ${
          value ? 'top-1 text-xs text-gray-600' : 'top-1/2 -translate-y-1/2 text-sm text-gray-500'
        } peer-focus:top-1 peer-focus:text-xs peer-focus:text-krooa-green`}>
          {label}
        </label>
        {error && (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-0.5 text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}
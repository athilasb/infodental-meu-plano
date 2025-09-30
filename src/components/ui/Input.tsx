import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  floating?: boolean; // Nova prop para ativar floating label
}

export function Input({
  label,
  error,
  fullWidth = false,
  icon,
  floating = false,
  className = '',
  onFocus,
  onBlur,
  value,
  placeholder,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && String(value).length > 0;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Input com floating label
  if (floating && label) {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              {icon}
            </div>
          )}
          <input
            className={`
              peer w-full rounded-xl border border-gray-300 px-4 pt-5 pb-2
              focus:border-krooa-blue focus:outline-none focus:ring-2 focus:ring-krooa-blue/20
              disabled:bg-gray-50 disabled:text-gray-500
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-300' : ''}
              ${className}
            `}
            placeholder=" "
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          <label
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${icon ? 'left-10' : ''}
              ${hasValue || isFocused
                ? 'top-2 text-xs text-gray-600'
                : 'top-1/2 -translate-y-1/2 text-sm text-gray-500'
              }
              peer-focus:top-2 peer-focus:text-xs peer-focus:text-krooa-blue
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm
              ${error ? 'text-red-500' : ''}
            `}
          >
            {label}
          </label>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // Input tradicional (mantido para compatibilidade)
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && !floating && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full rounded-xl border border-gray-300 px-4 py-2.5
            focus:border-krooa-blue focus:outline-none focus:ring-2 focus:ring-krooa-blue/20
            disabled:bg-gray-50 disabled:text-gray-500
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-300' : ''}
            ${className}
          `}
          placeholder={placeholder}
          value={value}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Componente de Input compacto para formulários densos
export function CompactInput({
  label,
  error,
  fullWidth = false,
  className = '',
  ...props
}: InputProps) {
  return (
    <Input
      label={label}
      error={error}
      fullWidth={fullWidth}
      floating={true}
      className={`py-1.5 text-sm ${className}`}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  options: Array<{ value: string; label: string }>;
  floating?: boolean;
}

export function Select({
  label,
  error,
  fullWidth = false,
  options,
  floating = false,
  className = '',
  value,
  onFocus,
  onBlur,
  ...props
}: SelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && String(value).length > 0;

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Select com floating label
  if (floating && label) {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <div className="relative">
          <select
            className={`
              peer w-full rounded-xl border border-gray-300 px-4 pt-5 pb-2
              focus:border-krooa-blue focus:outline-none focus:ring-2 focus:ring-krooa-blue/20
              disabled:bg-gray-50 disabled:text-gray-500
              ${error ? 'border-red-300' : ''}
              ${!hasValue ? 'text-gray-500' : ''}
              ${className}
            `}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          >
            <option value="" className="text-gray-400">Selecione...</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${hasValue || isFocused
                ? 'top-2 text-xs text-gray-600'
                : 'top-1/2 -translate-y-1/2 text-sm text-gray-500'
              }
              ${error ? 'text-red-500' : ''}
            `}
          >
            {label}
          </label>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // Select tradicional
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && !floating && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={`
          w-full rounded-xl border border-gray-300 px-4 py-2.5
          focus:border-krooa-blue focus:outline-none focus:ring-2 focus:ring-krooa-blue/20
          disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-300' : ''}
          ${className}
        `}
        value={value}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  floating?: boolean;
}

export function Textarea({
  label,
  error,
  fullWidth = false,
  floating = false,
  className = '',
  value,
  onFocus,
  onBlur,
  ...props
}: TextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && String(value).length > 0;

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Textarea com floating label
  if (floating && label) {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <div className="relative">
          <textarea
            className={`
              peer w-full rounded-xl border border-gray-300 px-4 pt-5 pb-2
              focus:border-krooa-blue focus:outline-none focus:ring-2 focus:ring-krooa-blue/20
              disabled:bg-gray-50 disabled:text-gray-500
              ${error ? 'border-red-300' : ''}
              ${className}
            `}
            placeholder=" "
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          <label
            className={`
              absolute left-4 top-2 transition-all duration-200 pointer-events-none
              text-xs text-gray-600
              peer-focus:text-krooa-blue
              ${error ? 'text-red-500' : ''}
            `}
          >
            {label}
          </label>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // Textarea tradicional
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && !floating && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full rounded-xl border border-gray-300 px-4 py-2.5
          focus:border-krooa-blue focus:outline-none focus:ring-2 focus:ring-krooa-blue/20
          disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-300' : ''}
          ${className}
        `}
        value={value}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
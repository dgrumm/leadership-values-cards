'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  validationState?: 'valid' | 'invalid' | 'neutral';
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    label,
    error,
    validationState = 'neutral',
    helperText,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseStyles = 'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
    const stateStyles = {
      neutral: 'focus:ring-blue-500 focus:border-blue-500',
      valid: 'border-green-500 focus:ring-green-500 focus:border-green-500',
      invalid: 'border-red-500 focus:ring-red-500 focus:border-red-500'
    };

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        
        <input
          type={type}
          className={cn(
            baseStyles,
            stateStyles[validationState],
            className
          )}
          ref={ref}
          id={inputId}
          {...props}
        />
        
        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
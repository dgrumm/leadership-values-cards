'use client';

import * as React from 'react';
import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { formatSessionCode } from '@/lib/utils/validation';
import { generateUniqueSessionCode } from '@/lib/utils/session-codes';
import { cn } from '@/lib/utils/cn';

export interface SessionCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  validationState?: 'valid' | 'invalid' | 'neutral';
  disabled?: boolean;
}

export function SessionCodeInput({
  value,
  onChange,
  onBlur,
  error,
  validationState = 'neutral',
  disabled = false
}: SessionCodeInputProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSessionCode(e.target.value);
    onChange(formatted);
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    
    try {
      const newCode = await generateUniqueSessionCode();
      onChange(newCode);
      
      // Brief success feedback
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
    } catch (error) {
      console.warn('Failed to generate session code:', error);
      // Fallback to simple random code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let fallbackCode = '';
      for (let i = 0; i < 6; i++) {
        fallbackCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      onChange(fallbackCode);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor="session-code" className="text-sm font-medium text-gray-700">
        Session Code:
      </label>
      
      <div className="relative flex">
        <Input
          id="session-code"
          name="sessionCode"
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={onBlur}
          placeholder="ABC123"
          maxLength={6}
          className={cn(
            'pr-12 font-mono text-center text-lg tracking-widest uppercase',
            validationState === 'valid' && 'border-green-500 focus:ring-green-500',
            validationState === 'invalid' && 'border-red-500 focus:ring-red-500'
          )}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          data-autofill="false"
          data-lpignore="true"
          data-testid="session-code-input"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-8 w-8 p-0"
          onClick={handleGenerateCode}
          disabled={disabled || isGenerating}
          title="Generate new session code"
          data-testid="generate-code-button"
        >
          <svg
            className={cn(
              'h-4 w-4 text-gray-400 hover:text-gray-600',
              isGenerating && 'animate-spin'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      <p className="text-xs text-gray-500">
        6-character code to join an existing session, or generate a new one
      </p>
    </div>
  );
}
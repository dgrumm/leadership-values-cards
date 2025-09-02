'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export interface RevealButtonProps {
  step: 'top8' | 'top3';
  isRevealed: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onReveal: (step: 'top8' | 'top3') => void;
  className?: string;
}

export function RevealButton({
  step,
  isRevealed,
  isLoading = false,
  disabled = false,
  onReveal,
  className
}: RevealButtonProps) {
  const handleClick = () => {
    if (!isRevealed && !isLoading && !disabled) {
      onReveal(step);
    }
  };

  const isDisabled = disabled || isLoading;
  const stepLabel = step === 'top8' ? 'Top 8' : 'Top 3';

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled || isRevealed}
      variant={isRevealed ? 'outline' : 'secondary'}
      className={cn(
        'w-full transition-all',
        isRevealed && 'bg-green-50 border-green-200 text-green-700 cursor-default',
        !isRevealed && !isDisabled && 'hover:bg-indigo-600 hover:text-white',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={
        isRevealed 
          ? `Your ${stepLabel} values are revealed to the group`
          : `Reveal your ${stepLabel} values to the group`
      }
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {isRevealed ? '✅' : '👁️'}
        </span>
        <span className="font-medium">
          {isLoading ? (
            'Revealing...'
          ) : isRevealed ? (
            `${stepLabel} Revealed`
          ) : (
            `Reveal ${stepLabel}`
          )}
        </span>
      </div>
    </Button>
  );
}

RevealButton.displayName = 'RevealButton';
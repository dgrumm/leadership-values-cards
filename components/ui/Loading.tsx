'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

export function Loading({ 
  size = 'md', 
  className, 
  text,
  variant = 'spinner'
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn(
                'bg-blue-600 rounded-full',
                size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : 'w-2 h-2'
              )}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <motion.div
          className={cn(
            'bg-blue-600 rounded-full',
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 1,
            repeat: Infinity
          }}
        />
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'border-2 border-blue-600 border-t-transparent rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface DeckSpinAnimationProps {
  participantName: string;
  onComplete?: () => void;
}

export function DeckSpinAnimation({ participantName, onComplete }: DeckSpinAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative">
      {/* Animated deck stack */}
      <div className={cn(
        'relative w-64 h-40 transition-transform duration-2000 ease-out',
        isAnimating && 'animate-spin-slow'
      )}>
        {/* Multiple card layers for depth effect */}
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'absolute inset-0 rounded-lg border border-gray-300 bg-white shadow-sm',
              'transform-gpu transition-all duration-2000'
            )}
            style={{
              transform: `translate(${index * 2}px, ${index * -2}px) rotateY(${isAnimating ? '180deg' : '0deg'})`,
              transformOrigin: 'center center',
              zIndex: 5 - index,
              transitionDelay: `${index * 100}ms`
            }}
          >
            {/* Card front (participant's personalized deck) */}
            <div className={cn(
              'absolute inset-0 rounded-lg p-6 flex flex-col items-center justify-center',
              'backface-hidden',
              !isAnimating && 'opacity-100',
              isAnimating && 'opacity-0'
            )}>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <span className="text-xl font-bold text-blue-600">
                  {participantName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 text-center">
                {participantName}&apos;s
              </h3>
              <p className="text-sm text-gray-600 text-center mt-1">
                Leadership Values
              </p>
            </div>

            {/* Card back (generic deck pattern) */}
            <div className={cn(
              'absolute inset-0 rounded-lg p-6 flex items-center justify-center',
              'backface-hidden rotate-y-180',
              isAnimating && 'opacity-100',
              !isAnimating && 'opacity-0'
            )}>
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 bg-gray-400 rounded"></div>
                  <div className="text-xs text-gray-500">Leadership Value Cards</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotateY(0deg);
          }
          to {
            transform: rotateY(360deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 2s ease-in-out;
        }
        
        .backface-hidden {
          backface-visibility: hidden;
        }
        
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        
        .duration-2000 {
          transition-duration: 2000ms;
        }
      `}</style>
    </div>
  );
}
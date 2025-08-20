'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ParticipantsButtonProps {
  participantCount?: number;
}

export function ParticipantsButton({ participantCount = 1 }: ParticipantsButtonProps) {

  const handleShowParticipants = () => {
    // TODO: Show participants modal/page
    alert('Participants view will be implemented in collaboration specs!');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShowParticipants}
      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
    >
      <span className="flex items-center space-x-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
        <span>{participantCount} Participants</span>
      </span>
    </Button>
  );
}
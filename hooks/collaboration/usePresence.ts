'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PresenceManager } from '@/lib/presence/presence-manager';
import { PARTICIPANT_EMOJIS, PARTICIPANT_COLORS } from '@/lib/constants/participants';
import { getAblyService } from '@/lib/ably/ably-service';
import type { PresenceData } from '@/lib/presence/types';

export interface UsePresenceOptions {
  sessionCode: string;
  participantName: string;
  currentStep: 1 | 2 | 3;
  enabled?: boolean;
}

export interface UsePresenceReturn {
  // Participant data
  participants: Map<string, PresenceData>;
  currentUser: PresenceData | null;
  participantCount: number;
  otherParticipants: PresenceData[];
  
  // Actions
  updateStatus: (status: PresenceData['status']) => Promise<void>;
  
  // Connection state
  isConnected: boolean;
  isInitializing: boolean;
  error: string | null;
  
  // For ParticipantList integration
  onViewReveal?: (participantId: string, revealType: 'revealed-8' | 'revealed-3') => void;
}

export function usePresence({
  sessionCode,
  participantName,
  currentStep,
  enabled = true
}: UsePresenceOptions): UsePresenceReturn {
  const [presenceManager, setPresenceManager] = useState<PresenceManager | null>(null);
  const [participants, setParticipants] = useState<Map<string, PresenceData>>(new Map());
  const [currentUser, setCurrentUser] = useState<PresenceData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize presence manager
  useEffect(() => {
    if (!enabled || !sessionCode || !participantName) {
      return;
    }

    let manager: PresenceManager | null = null;

    const initializePresence = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Get Ably service
        const ablyService = getAblyService();
        await ablyService.init();

        // Simple random emoji and color assignment
        const emoji = PARTICIPANT_EMOJIS[Math.floor(Math.random() * PARTICIPANT_EMOJIS.length)];
        const color = PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
        
        console.log(`🎨 Randomly assigned identity for ${participantName}:`, { emoji, color });

        // Create current user data
        const currentUserData: PresenceData = {
          participantId: ablyService.client?.auth.clientId || `user-${Date.now()}`,
          name: participantName,
          emoji,
          color,
          currentStep,
          status: 'sorting',
          cursor: { x: 0, y: 0, timestamp: Date.now() },
          lastActive: Date.now(),
          isViewing: null
        };

        // Create presence manager
        manager = new PresenceManager(
          ablyService,
          sessionCode,
          {
            id: currentUserData.participantId,
            name: participantName,
            emoji,
            color
          }
        );

        // Enter presence
        await manager.enter(currentUserData);

        setPresenceManager(manager);
        setCurrentUser(currentUserData);
        setIsConnected(true);

        console.log('✅ Presence initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize presence:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to presence service');
      } finally {
        setIsInitializing(false);
      }
    };

    initializePresence();

    // Cleanup on unmount
    return () => {
      if (manager) {
        manager.cleanup();
      }
    };
  }, [enabled, sessionCode, participantName, currentStep]);

  // Simple polling for participants
  useEffect(() => {
    if (!presenceManager) return;

    const updateParticipants = () => {
      const latestParticipants = presenceManager.getParticipants();
      setParticipants(new Map(latestParticipants));
    };

    // Initial update
    updateParticipants();

    // Simple polling every 2 seconds
    const interval = setInterval(updateParticipants, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [presenceManager]);

  // Update status function
  const updateStatus = useCallback(async (status: PresenceData['status']) => {
    if (!presenceManager || !currentUser) {
      throw new Error('Presence manager not initialized');
    }

    try {
      await presenceManager.updateStatus(status);
      
      // Update local current user state
      const updatedUser = {
        ...currentUser,
        status,
        lastActive: Date.now()
      };
      setCurrentUser(updatedUser);

      console.log(`✅ Status updated to: ${status}`);
    } catch (err) {
      console.error('❌ Failed to update status:', err);
      throw err;
    }
  }, [presenceManager, currentUser]);

  // Computed values
  const participantCount = participants.size;
  
  const otherParticipants = useMemo(() => {
    const others: PresenceData[] = [];
    for (const [participantId, participant] of participants) {
      if (participantId !== currentUser?.participantId) {
        others.push(participant);
      }
    }
    return others.sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, currentUser?.participantId]);

  // View reveal handler (placeholder for future reveal feature)
  const onViewReveal = useCallback((participantId: string, revealType: 'revealed-8' | 'revealed-3') => {
    console.log(`👁️ Viewing ${revealType} for participant: ${participantId}`);
    // TODO: Implement reveal viewing in 04.3 spec
    alert(`Viewing ${revealType} for participant ${participantId} will be implemented in reveal mechanism spec!`);
  }, []);

  return {
    // Participant data
    participants,
    currentUser,
    participantCount,
    otherParticipants,
    
    // Actions
    updateStatus,
    
    // Connection state
    isConnected,
    isInitializing,
    error,
    
    // For ParticipantList integration
    onViewReveal
  };
}
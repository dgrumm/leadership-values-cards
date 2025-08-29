'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PresenceManager } from '@/lib/presence/presence-manager';
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
  participants: Map<string, PresenceData>; // Others only (filtered)
  allParticipantsForDisplay: Map<string, PresenceData>; // Combined self + others for UI
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

        // Get participant identity from session (single source of truth)
        const { getSessionManager } = await import('@/lib/session/session-manager');
        const sessionManager = getSessionManager();
        const { PARTICIPANT_EMOJIS, PARTICIPANT_COLORS } = await import('@/lib/constants/participants');
        
        console.log(`🔍 Looking for participant "${participantName}" in session "${sessionCode}"`);
        const participant = await sessionManager.getCurrentParticipant(sessionCode, participantName);
        
        let emoji: string;
        let color: string;
        
        if (participant) {
          // Use session identity (preferred path)
          emoji = participant.emoji;
          color = participant.color;
          console.log(`✅ Using session identity for ${participantName}:`, { emoji, color });
        } else {
          // Fallback: Debug info and temporary random assignment
          const session = await sessionManager.getSession(sessionCode);
          console.warn(`⚠️ Participant "${participantName}" not found in session "${sessionCode}" - using fallback`);
          console.warn(`📋 Available participants:`, session?.participants?.map(p => ({ name: p.name, isActive: p.isActive })));
          
          // Temporary fallback to prevent complete failure
          emoji = PARTICIPANT_EMOJIS[Math.floor(Math.random() * PARTICIPANT_EMOJIS.length)];
          color = PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
          console.warn(`🔄 Fallback identity for ${participantName}:`, { emoji, color });
        }

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

  // Event-driven participant updates (replaces polling)
  useEffect(() => {
    if (!presenceManager) return;

    console.log('🎯 Setting up event-driven participant updates (no more polling!)');
    
    // Subscribe to real-time participant changes
    const unsubscribe = presenceManager.onParticipantChange((latestParticipants) => {
      console.log(`📋 Participant update received: ${latestParticipants.size} participants`);
      
      // Filter out current user to prevent race conditions
      // Self should always come from local currentUser state, not Ably events
      const currentUserId = presenceManager.getCurrentUserData()?.participantId;
      const othersOnly = new Map<string, PresenceData>();
      
      for (const [id, participant] of latestParticipants) {
        if (id !== currentUserId) {
          othersOnly.set(id, participant);
        }
      }
      
      console.log(`👥 Others participants (excluding self): ${othersOnly.size}`);
      setParticipants(othersOnly);
    });

    return unsubscribe;
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

  // Computed values (participants now only contains others, not self)
  const participantCount = participants.size + (currentUser ? 1 : 0); // Total = others + self
  
  const otherParticipants = useMemo(() => {
    // Since participants now only contains others, we can use it directly
    const others: PresenceData[] = [];
    for (const [, participant] of participants) {
      others.push(participant);
    }
    return others.sort((a, b) => a.name.localeCompare(b.name));
  }, [participants]);

  // Combined participants for display (self from local state + others from Ably events)
  const allParticipantsForDisplay = useMemo(() => {
    const combined = new Map<string, PresenceData>();
    
    // Add current user from local state (single source of truth for self)
    if (currentUser) {
      combined.set(currentUser.participantId, currentUser);
    }
    
    // Add others from Ably events
    for (const [id, participant] of participants) {
      combined.set(id, participant);
    }
    
    return combined;
  }, [currentUser, participants]);

  // View reveal handler (placeholder for future reveal feature)
  const onViewReveal = useCallback((participantId: string, revealType: 'revealed-8' | 'revealed-3') => {
    console.log(`👁️ Viewing ${revealType} for participant: ${participantId}`);
    // TODO: Implement reveal viewing in 04.3 spec
    alert(`Viewing ${revealType} for participant ${participantId} will be implemented in reveal mechanism spec!`);
  }, []);

  return {
    // Participant data
    participants, // Others only (for internal use)
    allParticipantsForDisplay, // Combined self + others (for UI components)
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
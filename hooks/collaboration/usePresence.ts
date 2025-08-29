'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PresenceManager } from '@/lib/presence/presence-manager';
import { getAblyService } from '@/lib/ably/ably-service';
import type { PresenceData } from '@/lib/presence/types';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';
import { createParticipantDisplayData, createParticipantDisplayDataFromPresence } from '@/lib/types/participant-display';

export interface UsePresenceOptions {
  sessionCode: string;
  participantName: string;
  currentStep: 1 | 2 | 3;
  enabled?: boolean;
}

export interface UsePresenceReturn {
  // NEW: Hybrid participant data (session + presence) - USE THIS FOR UI DISPLAY
  participantsForDisplay: Map<string, ParticipantDisplayData>; // All participants with consistent identity/step from session
  currentUserForDisplay: ParticipantDisplayData | null;
  otherParticipantsForDisplay: ParticipantDisplayData[];
  
  // LEGACY: Raw presence data (for internal use only - DO NOT use for UI display)
  participants: Map<string, PresenceData>; // Others only (filtered)
  allParticipantsForDisplay: Map<string, PresenceData>; // Combined self + others for UI (DEPRECATED)
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
  
  // NEW: Hybrid display data state
  const [participantsForDisplay, setParticipantsForDisplay] = useState<Map<string, ParticipantDisplayData>>(new Map());
  const [currentUserForDisplay, setCurrentUserForDisplay] = useState<ParticipantDisplayData | null>(null);
  
  // Force refresh trigger for session data updates
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
          
          // Deterministic fallback based on participant name to ensure consistency across observers
          const nameHash = participantName.split('').reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0);
          }, 0);
          const emojiIndex = Math.abs(nameHash) % PARTICIPANT_EMOJIS.length;
          const colorIndex = Math.abs(nameHash * 31) % PARTICIPANT_COLORS.length; // Different hash for color
          
          emoji = PARTICIPANT_EMOJIS[emojiIndex];
          color = PARTICIPANT_COLORS[colorIndex];
          console.warn(`🔄 Deterministic fallback identity for ${participantName}:`, { emoji, color });
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

  // NEW: Create hybrid display data by merging session + presence 
  useEffect(() => {
    if (!sessionCode || !currentUser) return;
    
    const createHybridDisplayData = async () => {
      try {
        const { getSessionManager } = await import('@/lib/session/session-manager');
        const sessionManager = getSessionManager();
        
        // Get current session to access all participants
        const session = await sessionManager.getSession(sessionCode);
        if (!session) {
          console.warn(`⚠️ Session ${sessionCode} not found for display data creation`);
          return;
        }
        
        const hybridParticipants = new Map<string, ParticipantDisplayData>();
        let hybridCurrentUser: ParticipantDisplayData | null = null;
        
        // Process each session participant
        for (const sessionParticipant of session.participants) {
          if (!sessionParticipant.isActive) continue;
          
          // Find corresponding presence data
          const presenceData = sessionParticipant.name === participantName 
            ? currentUser // Use local current user for self
            : participants.get(sessionParticipant.id); // Lookup others in presence map
          
          // Create hybrid display data
          const displayData = createParticipantDisplayData(
            sessionParticipant,
            presenceData || null,
            currentUser.participantId
          );
          
          hybridParticipants.set(sessionParticipant.id, displayData);
          
          if (sessionParticipant.name === participantName) {
            hybridCurrentUser = displayData;
          }
        }
        
        // Handle presence-only participants (shouldn't happen in normal flow, but defensive)
        for (const [participantId, presenceData] of participants) {
          if (!hybridParticipants.has(participantId)) {
            console.warn(`⚠️ Found presence-only participant: ${presenceData.name}`);
            const fallbackDisplayData = createParticipantDisplayDataFromPresence(
              presenceData,
              currentUser.participantId
            );
            hybridParticipants.set(participantId, fallbackDisplayData);
          }
        }
        
        console.log(`🎯 Created hybrid display data for ${hybridParticipants.size} participants`);
        setParticipantsForDisplay(hybridParticipants);
        setCurrentUserForDisplay(hybridCurrentUser);
        
      } catch (error) {
        console.error('❌ Failed to create hybrid display data:', error);
      }
    };
    
    createHybridDisplayData();
  }, [sessionCode, currentUser, participants, participantName, refreshTrigger]);
  
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

  // Periodic refresh of session data for step progress updates
  useEffect(() => {
    if (!sessionCode || !enabled) return;
    
    console.log('🔄 Setting up session data refresh for step progress updates');
    
    const refreshInterval = setInterval(() => {
      console.log('🔄 Refreshing session data for step progress updates');
      setRefreshTrigger(prev => prev + 1);
    }, 5000); // Refresh every 5 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [sessionCode, enabled]);

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
  
  // NEW: Computed values for hybrid display data
  const otherParticipantsForDisplay = useMemo(() => {
    const others: ParticipantDisplayData[] = [];
    for (const [participantId, participant] of participantsForDisplay) {
      if (!participant.isCurrentUser) {
        others.push(participant);
      }
    }
    return others.sort((a, b) => a.name.localeCompare(b.name));
  }, [participantsForDisplay]);

  // View reveal handler (placeholder for future reveal feature)
  const onViewReveal = useCallback((participantId: string, revealType: 'revealed-8' | 'revealed-3') => {
    console.log(`👁️ Viewing ${revealType} for participant: ${participantId}`);
    // TODO: Implement reveal viewing in 04.3 spec
    alert(`Viewing ${revealType} for participant ${participantId} will be implemented in reveal mechanism spec!`);
  }, []);

  return {
    // NEW: Hybrid participant data (session + presence) - USE THIS FOR UI DISPLAY
    participantsForDisplay, // All participants with consistent identity/step from session
    currentUserForDisplay, // Self with session identity + presence status
    otherParticipantsForDisplay, // Others with session identity + presence status
    
    // LEGACY: Raw presence data (for internal use only - DO NOT use for UI display)
    participants, // Others only (for internal use)
    allParticipantsForDisplay, // Combined self + others (DEPRECATED)
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
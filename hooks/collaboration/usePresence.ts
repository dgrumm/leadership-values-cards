'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  
  // Refs to avoid stale closures
  const participantsRef = useRef<Map<string, PresenceData>>(participants);
  
  // Keep ref current
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

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

        // Check for existing participant cookie to reuse identity on refresh
        const cookieName = `participant-${sessionCode}-${participantName}`;
        let participant = null;
        let existingIdentity = null;
        
        // Check cookie first for existing identity
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(';');
          const participantCookie = cookies.find(c => c.trim().startsWith(`${cookieName}=`));
          if (participantCookie) {
            try {
              existingIdentity = JSON.parse(decodeURIComponent(participantCookie.split('=')[1]));
              console.log(`🍪 Found existing identity for ${participantName}:`, existingIdentity);
            } catch (error) {
              console.warn('Failed to parse participant cookie:', error);
            }
          }
        }
        
        // Get participant identity from session via API
        console.log(`🔍 Looking for participant "${participantName}" in session "${sessionCode}"`);
        try {
          const response = await fetch(`/api/sessions/${sessionCode}`);
          if (response.ok) {
            const data = await response.json();
            participant = data.session?.participants?.find((p: any) => p.name === participantName && p.isActive);
          }
        } catch (error) {
          console.warn(`Failed to fetch session data: ${error}`);
        }
        
        const { PARTICIPANT_EMOJIS, PARTICIPANT_COLORS } = await import('@/lib/constants/participants');
        
        let emoji: string;
        let color: string;
        
        if (participant) {
          // Use session identity (preferred path)
          emoji = participant.emoji;
          color = participant.color;
          console.log(`✅ Using session identity for ${participantName}:`, { emoji, color });
        } else if (existingIdentity) {
          // Use cookie identity (for browser refresh)
          emoji = existingIdentity.emoji;
          color = existingIdentity.color;
          console.log(`🍪 Using cookie identity for ${participantName}:`, { emoji, color });
        } else {
          // Fallback: Debug info and temporary random assignment
          console.warn(`⚠️ Participant "${participantName}" not found in session "${sessionCode}" - using fallback`);
          
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
          participantId: ablyService.getClientId() || `user-${Date.now()}`,
          name: participantName,
          emoji,
          color,
          currentStep,
          status: 'sorting',
          cursor: { x: 0, y: 0, timestamp: Date.now() },
          lastActive: Date.now(),
          isViewing: null
        };
        
        // Save identity to cookie for browser refresh (expires in 60 minutes)
        if (typeof document !== 'undefined') {
          const identityData = { emoji, color };
          const expires = new Date(Date.now() + 60 * 60 * 1000).toUTCString();
          document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(identityData))}; expires=${expires}; path=/`;
          console.log(`🍪 Saved identity cookie for ${participantName}`);
        }

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
  }, [enabled, sessionCode, participantName]); // Removed currentStep to prevent PresenceManager recreation

  // THROTTLED: Only update display data when presence actually changes
  const updateDisplayDataImmediate = useCallback(async () => {
    if (!sessionCode || !currentUser) return;
    
    try {
      // OPTION 3: Always fetch fresh session data - no cache for step transitions
      // This eliminates flip-flopping by ensuring we always have the latest step data
      const response = await fetch(`/api/sessions/${sessionCode}`);
      if (!response.ok) {
        console.log(`🧹 Session ${sessionCode} no longer exists`);
        setParticipantsForDisplay(new Map());
        setCurrentUserForDisplay(null);
        return;
      }
      
      const session = await response.json();
      
      const hybridParticipants = new Map<string, ParticipantDisplayData>();
      let hybridCurrentUser: ParticipantDisplayData | null = null;
      
      // NAME-BASED USER MERGING: Group participants by base name and show most recent session for each unique user
      const participantsByBaseName = new Map<string, any[]>();
      
      session.participants?.forEach((sessionParticipant: any) => {
        if (!sessionParticipant.isActive) return;
        
        // Extract base name (Dave-2 → Dave, Bob-5 → Bob, Frank → Frank)
        const baseName = sessionParticipant.name.replace(/-\d+$/, '');
        if (!participantsByBaseName.has(baseName)) {
          participantsByBaseName.set(baseName, []);
        }
        participantsByBaseName.get(baseName)!.push(sessionParticipant);
      });
      
      // For each unique base name, show only the most recent session
      participantsByBaseName.forEach((participantSessions: any[]) => {
        const mostRecentSession = participantSessions.sort((a: any, b: any) => 
          new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime()
        )[0];
        
        // Find corresponding presence data - match by base name for current user
        const currentUserBaseName = participantName.replace(/-\d+$/, '');
        const sessionBaseName = mostRecentSession.name.replace(/-\d+$/, '');
        
        // Find presence data for this participant
        let presenceData: PresenceData | null = null;
        
        if (sessionBaseName === currentUserBaseName) {
          // Use local current user for self (base name match)
          presenceData = currentUser;
        } else {
          // For others, find by matching name (not participant ID which differs between session/presence)
          participantsRef.current.forEach((participant) => {
            // Match by name - presence and session should have same participant name
            if (participant.name === mostRecentSession.name) {
              presenceData = participant;
            }
          });
        }
        
        // NOTE: No conflict resolution needed here - createParticipantDisplayData() 
        // already uses session data as authoritative source for currentStep/identity
        
        // DEBUG: Log the data sources being merged to understand flip-flopping
        if (mostRecentSession.name === 'Dave') {
          console.log(`🔍 DAVE DEBUG - Session says Step ${mostRecentSession.currentStep}, Presence says Step ${presenceData?.currentStep || 'null'}`);
        }
        
        // Show all session participants, but mark presence status
        // During step transitions, presence data may be temporarily unavailable
        const displayData = createParticipantDisplayData(
          mostRecentSession,
          presenceData || null,
          currentUser.participantId
        );
        
        hybridParticipants.set(mostRecentSession.id, displayData);
        if (sessionBaseName === currentUserBaseName) {
          hybridCurrentUser = displayData;
        }
        
        // Log when presence is missing (for debugging, but still show participant)
        if (sessionBaseName !== currentUserBaseName && !presenceData) {
          console.log(`⚠️ No presence data for ${mostRecentSession.name} (may be transitioning)`);
        }
      });
      
      // Only log when participant count actually changes to reduce noise
      const prevCount = participantsForDisplay.size;
      const newCount = hybridParticipants.size;
      if (newCount !== prevCount) {
        console.log(`🎯 Hybrid display data: ${prevCount} → ${newCount} participants`);
      }
      setParticipantsForDisplay(hybridParticipants);
      setCurrentUserForDisplay(hybridCurrentUser);
      
    } catch (error) {
      console.error('❌ Failed to create hybrid display data:', error);
    }
  }, [sessionCode, currentUser, participantName]); // Removed participants from callback deps
  
  // Throttled version to prevent API spam
  const updateDisplayDataThrottled = useRef<NodeJS.Timeout | null>(null);
  const updateDisplayData = useCallback((immediate: boolean = false) => {
    // Clear any existing timeout
    if (updateDisplayDataThrottled.current) {
      clearTimeout(updateDisplayDataThrottled.current);
    }
    
    if (immediate) {
      // For critical updates like step changes, update immediately
      updateDisplayDataImmediate();
    } else {
      // Throttle API calls to max once every 500ms for other updates
      updateDisplayDataThrottled.current = setTimeout(() => {
        updateDisplayDataImmediate();
      }, 500);
    }
  }, [updateDisplayDataImmediate]);
  
  // TRIGGER: Only update when presence actually changes (not reactive session state)
  useEffect(() => {
    updateDisplayData();
  }, [updateDisplayData, participants]); // Only presence changes trigger updates
  
  // Update current step in existing presence manager (no recreation)
  useEffect(() => {
    if (!presenceManager || !currentUser) return;
    
    // Only update if step actually changed to prevent loops
    if (currentUser.currentStep === currentStep) return;
    
    console.log(`🔄 Updating step from ${currentUser.currentStep} to ${currentStep} for ${currentUser.name}`);
    
    // Update local state first
    const updatedUserData = {
      ...currentUser,
      currentStep,
      lastActive: Date.now()
    };
    setCurrentUser(updatedUserData);
    
    // Update presence without recreating the manager (no await to prevent blocking)
    presenceManager.updateCurrentStep(currentStep).catch((error) => {
      console.warn('Failed to update step in presence:', error);
    });
  }, [currentStep, presenceManager, currentUser?.currentStep]); // Only react to actual step changes
  
  // Event-driven participant updates (no polling)
  useEffect(() => {
    if (!presenceManager) return;

    console.log('🎯 Setting up event-driven participant updates');
    
    // Subscribe to real-time participant changes
    const unsubscribe = presenceManager.onParticipantChange((latestParticipants) => {
      // Filter out current user to prevent race conditions
      // Self should always come from local currentUser state, not Ably events
      const currentUserId = presenceManager.getCurrentUserData()?.participantId;
      const othersOnly = new Map<string, PresenceData>();
      let hasStepChanges = false;
      
      latestParticipants.forEach((participant: PresenceData, id: string) => {
        if (id !== currentUserId) {
          // Check if this participant had a step change
          const previousParticipant = participantsRef.current.get(id);
          if (previousParticipant && previousParticipant.currentStep !== participant.currentStep) {
            hasStepChanges = true;
            console.log(`🚀 STEP CHANGE DETECTED: ${participant.name} ${previousParticipant.currentStep} → ${participant.currentStep}`);
          }
          othersOnly.set(id, participant);
        }
      });
      
      // Only log significant changes to reduce noise
      const prevSize = participantsRef.current.size;
      const newSize = othersOnly.size;
      if (newSize !== prevSize) {
        console.log(`👥 Participants changed: ${prevSize} → ${newSize}`);
      }
      
      setParticipants(othersOnly);
      
      // If step changes detected, update display immediately (bypass throttling)
      if (hasStepChanges) {
        console.log(`⚡ Immediate update triggered by step changes`);
        updateDisplayData(true); // immediate = true
      }
    });

    return unsubscribe;
  }, [presenceManager, updateDisplayData]);
  
  // Cleanup throttled timeout on unmount
  useEffect(() => {
    return () => {
      if (updateDisplayDataThrottled.current) {
        clearTimeout(updateDisplayDataThrottled.current);
      }
    };
  }, []);

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
    participants.forEach((participant: PresenceData) => {
      others.push(participant);
    });
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
    participants.forEach((participant: PresenceData, id: string) => {
      combined.set(id, participant);
    });
    
    return combined;
  }, [currentUser, participants]);
  
  // NEW: Computed values for hybrid display data
  const otherParticipantsForDisplay = useMemo(() => {
    const others: ParticipantDisplayData[] = [];
    participantsForDisplay.forEach((participant: ParticipantDisplayData) => {
      if (!participant.isCurrentUser) {
        others.push(participant);
      }
    });
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
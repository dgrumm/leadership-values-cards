/**
 * Event-Driven Session Context - Integrates event system with Zustand stores
 * Replaces the hybrid Session API + Presence Events with pure event architecture
 */

'use client';

import React, { createContext, useContext, useMemo, useEffect, useState, useCallback, type ReactNode } from 'react';
import { SessionStoreManager } from '@/lib/stores/session-store-manager';
import { EventBus } from '@/lib/events/event-bus';
import { ViewerSync } from '@/lib/collaboration/viewer-sync';
import { 
  createBaseEvent, 
  EVENT_TYPES, 
  type StepTransitionedEvent, 
  type ParticipantJoinedEvent,
  type ParticipantLeftEvent
} from '@/lib/events/types';
import { useAbly } from '@/hooks/collaboration/useAbly';
import { RevealManager } from '@/lib/reveals/reveal-manager';
import { useRevealManager } from '@/hooks/reveals/useRevealManager';

// Import the old context interface for backward compatibility
interface SessionStoreContextValue {
  sessionManager: SessionStoreManager;
  sessionCode: string;
  participantId: string;
}

const SessionStoreContext = createContext<SessionStoreContextValue | null>(null);

interface EventDrivenSessionContextValue {
  sessionManager: SessionStoreManager;
  eventBus: EventBus;
  viewerSync: ViewerSync | null; // Added ViewerSync for arrangement sharing
  viewerSyncArrangements: Map<string, any>; // Reactive state for ViewerSync arrangements
  sessionCode: string;
  participantId: string;
  participantName: string;
  // Event publishing functions
  publishStepTransition: (fromStep: 1 | 2 | 3, toStep: 1 | 2 | 3) => Promise<void>;
  publishParticipantJoined: () => Promise<void>;
  publishParticipantLeft: () => Promise<void>;
  // Session cleanup
  leaveSession: () => Promise<void>;
  // Connection status
  isConnected: boolean;
  connectionError: string | null;
  // Participant state (replaces old presence system)
  participantSteps: Map<string, { currentStep: 1 | 2 | 3; participantName: string; status: string }>;
  participantCount: number;
  // For UI compatibility with old usePresence
  participantsForDisplay: Map<string, any>;
  currentUser: { participantId: string; name: string } | null;
  onViewReveal: (participantId: string, revealType: 'revealed-8' | 'revealed-3') => void;
  // Reveal functionality
  revealManager: RevealManager | null;
  revealSelection: (revealType: 'top8' | 'top3', cardPositions: any[]) => Promise<void>;
  unrevealSelection: (revealType: 'top8' | 'top3') => Promise<void>;
  isRevealed: (revealType: 'top8' | 'top3') => boolean;
  canReveal: (revealType: 'top8' | 'top3', cardCount: number) => boolean;
}

const EventDrivenSessionContext = createContext<EventDrivenSessionContextValue | null>(null);

interface EventDrivenSessionProviderProps {
  sessionCode: string;
  participantId: string;
  participantName: string;
  children: ReactNode;
  config?: {
    autoCleanupDelayMs?: number;
    maxStoresPerSession?: number;
    enableMemoryTracking?: boolean;
    enableDebugLogging?: boolean;
  };
}

/**
 * EventDrivenSessionProvider - Provides event-driven session management
 * 
 * Replaces the old hybrid architecture with deterministic event-driven approach
 * to eliminate race conditions in step transitions and participant updates
 */
export const EventDrivenSessionProvider: React.FC<EventDrivenSessionProviderProps> = ({
  sessionCode,
  participantId,
  participantName,
  children,
  config = {}
}) => {
  // Validate required props
  if (!sessionCode || typeof sessionCode !== 'string') {
    throw new Error('EventDrivenSessionProvider: sessionCode is required and must be a non-empty string');
  }
  
  if (!participantId || typeof participantId !== 'string') {
    throw new Error('EventDrivenSessionProvider: participantId is required and must be a non-empty string');
  }

  if (!participantName || typeof participantName !== 'string') {
    throw new Error('EventDrivenSessionProvider: participantName is required and must be a non-empty string');
  }

  // Get Ably service from existing hook
  const { service: ably, isConnected, error: connectionError } = useAbly({ autoInit: true });

  // Participant state tracking (replaces old presence system)
  const [participantSteps, setParticipantSteps] = useState<Map<string, { currentStep: 1 | 2 | 3; participantName: string; status: string }>>(new Map());
  
  // Compute participant count from actual participants
  const participantCount = useMemo(() => participantSteps.size, [participantSteps]);

  // ViewerSync state for React updates
  const [viewerSyncArrangements, setViewerSyncArrangements] = useState<Map<string, any>>(new Map());

  // ViewerSync for real-time arrangement sharing
  const viewerSync = useMemo(() => {
    if (!ably) return null;
    
    return new ViewerSync({
      sessionCode,
      ablyService: ably,
      onArrangementUpdate: (arrangement) => {
        // Update React state to trigger re-renders
        setViewerSyncArrangements(prev => new Map(prev.set(arrangement.participantId, arrangement)));
      },
      onArrangementRemoved: (participantId) => {
        // Update React state to trigger re-renders
        setViewerSyncArrangements(prev => {
          const next = new Map(prev);
          next.delete(participantId);
          return next;
        });
      }
    });
  }, [ably, sessionCode]);

  // Create core services (memoized)
  const sessionManager = useMemo(() => {
    const managerConfig = {
      autoCleanupDelayMs: config.autoCleanupDelayMs,
      maxStoresPerSession: config.maxStoresPerSession,
      enableMemoryTracking: config.enableMemoryTracking,
      enableDebugLogging: config.enableDebugLogging,
      viewerSyncFactory: (sessionCode: string, participantId: string) => {
        // Return the shared ViewerSync instance for all participants in this session
        return viewerSync;
      }
    };
    
    return new SessionStoreManager(managerConfig);
  }, [viewerSync]); // Depend on viewerSync to recreate manager when Ably becomes available

  const eventBus = useMemo(() => {
    if (!ably) return null;
    return new EventBus(ably, sessionCode);
  }, [ably, sessionCode]);

  // Initialize ViewerSync when available
  useEffect(() => {
    if (viewerSync) {
      viewerSync.initialize()
        .then(() => console.log('✅ [ViewerSync] Initialized successfully'))
        .catch((error) => console.error('❌ [ViewerSync] Failed to initialize:', error));
    }
  }, [viewerSync]);

  // Initialize RevealManager when EventBus is ready
  const { revealManager } = useRevealManager({
    eventBus,
    sessionCode,
    participantId,
    participantName
  });

  // Remove EventStoreIntegration - no longer needed

  // Initialize event system when ready
  useEffect(() => {
    if (!eventBus || !isConnected || !ably) return;

    try {
      if (config.enableDebugLogging !== false) {
        console.log(`🚀 [EventDrivenSession] Initialized for ${sessionCode}:${participantId}`);
      }

      // Subscribe to presence events for real-time status updates
      const sessionChannel = ably.getChannel(sessionCode, 'presence');
      
      const handlePresenceUpdate = (presenceMessage: any) => {
        console.log(`📍 [PresenceListener] Presence update:`, presenceMessage);
        
        if (presenceMessage.data && presenceMessage.data.participantId && presenceMessage.data.status) {
          setParticipantSteps(prev => {
            const newSteps = new Map(prev);
            const existing = newSteps.get(presenceMessage.data.participantId);
            
            if (existing) {
              // Update existing participant with new status
              newSteps.set(presenceMessage.data.participantId, {
                ...existing,
                status: presenceMessage.data.status,
                currentStep: presenceMessage.data.currentStep || existing.currentStep
              });
              console.log(`📊 [PresenceListener] Updated ${existing.participantName} status to ${presenceMessage.data.status}`);
            }
            
            return newSteps;
          });
        }
      };
      
      // Listen to all presence events (enter, update, leave) - with safety check for tests
      if (sessionChannel.presence && typeof sessionChannel.presence.subscribe === 'function') {
        sessionChannel.presence.subscribe('enter', handlePresenceUpdate);
        sessionChannel.presence.subscribe('update', handlePresenceUpdate);
        
        // Handle participant leaving
        sessionChannel.presence.subscribe('leave', (presenceMessage: any) => {
          console.log(`👋 [PresenceListener] Participant left:`, presenceMessage.data?.name || 'Unknown');
          
          if (presenceMessage.data?.participantId) {
            setParticipantSteps(prev => {
              const newSteps = new Map(prev);
              newSteps.delete(presenceMessage.data.participantId);
              console.log(`🗑️ [PresenceListener] Removed participant: ${presenceMessage.data?.name}, remaining: ${newSteps.size}`);
              return newSteps;
            });
          }
        });
      }
      
      // Subscribe to step transition events
      console.log(`👂 [EventListener] Setting up event listener for ${sessionCode}:${participantId}`);
      const unsubscribe = eventBus.subscribeToEvents((event) => {
        console.log(`📥 [EventListener] Received event:`, event);
        
        if (event.type === EVENT_TYPES.STEP_TRANSITIONED) {
          const stepEvent = event as StepTransitionedEvent;
          console.log(`🎯 [EventListener] Processing step transition: ${stepEvent.payload.participantName} ${stepEvent.payload.fromStep} → ${stepEvent.payload.toStep}`);
          
          // Update participant step state
          setParticipantSteps(prev => {
            const newSteps = new Map(prev);
            const existing = newSteps.get(stepEvent.participantId);
            newSteps.set(stepEvent.participantId, {
              currentStep: stepEvent.payload.toStep,
              participantName: stepEvent.payload.participantName,
              status: existing?.status || 'sorting' // Preserve existing status or default to sorting
            });
            console.log(`📊 [EventListener] Updated participant steps:`, Array.from(newSteps.entries()));
            return newSteps;
          });
          
          console.log(`✅ [EventListener] Step transition event processed successfully`);
        } else if (event.type === EVENT_TYPES.PARTICIPANT_JOINED) {
          const joinEvent = event as ParticipantJoinedEvent;
          console.log(`👋 [EventListener] Processing participant joined: ${joinEvent.payload.participant.name}`);
          
          // Update participant count and steps
          setParticipantSteps(prev => {
            const newSteps = new Map(prev);
            newSteps.set(joinEvent.participantId, {
              currentStep: joinEvent.payload.participant.currentStep,
              participantName: joinEvent.payload.participant.name,
              status: joinEvent.payload.participant.status || 'sorting'
            });
            return newSteps;
          });
          
          // Participant count is computed from participantSteps size
          
          console.log(`✅ [EventListener] Participant joined event processed successfully`);
        } else if (event.type === EVENT_TYPES.PARTICIPANT_LEFT) {
          const leftEvent = event as ParticipantLeftEvent;
          console.log(`👋 [EventListener] Processing participant left: ${leftEvent.payload.participantName}`);
          
          // Remove participant from local state
          setParticipantSteps(prev => {
            const newSteps = new Map(prev);
            newSteps.delete(leftEvent.participantId);
            console.log(`📊 [EventListener] Removed participant from steps. Remaining:`, Array.from(newSteps.entries()));
            return newSteps;
          });
          
          console.log(`✅ [EventListener] Participant left event processed successfully`);
        } else {
          console.log(`📋 [EventListener] Ignoring event type: ${event.type}`);
        }
      });

      return () => {
        if (config.enableDebugLogging !== false) {
          console.log(`🧹 [EventDrivenSession] Cleaned up for ${sessionCode}:${participantId}`);
        }
        try {
          // Cleanup presence event listeners - with safety check
          if (sessionChannel && sessionChannel.presence && typeof sessionChannel.presence.unsubscribe === 'function') {
            sessionChannel.presence.unsubscribe('enter', handlePresenceUpdate);
            sessionChannel.presence.unsubscribe('update', handlePresenceUpdate);
          }
          
          // Cleanup event bus subscription
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (error) {
          console.warn('Failed to unsubscribe from EventDrivenSession events:', error);
        }
      };
    } catch (error) {
      console.error('❌ [EventDrivenSession] Failed to initialize:', error);
    }
  }, [eventBus, isConnected, ably, sessionCode, participantId, config.enableDebugLogging]);

  // Event publishing functions
  const publishStepTransition = async (fromStep: 1 | 2 | 3, toStep: 1 | 2 | 3) => {
    console.log(`🔥 [PublishStepTransition] Starting ${participantName}: ${fromStep} → ${toStep}`);
    
    if (!eventBus || !ably) {
      console.error('❌ [PublishStepTransition] EventBus or Ably not ready!');
      return;
    }

    try {
      // Update presence state for persistence
      const sessionChannel = ably.getChannel(sessionCode, 'presence');
      await sessionChannel.presence.update({
        participantId,
        name: participantName,
        currentStep: toStep,
        emoji: '🎯',
        color: 'blue',
        status: 'sorting',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      console.log(`📍 [PresenceSync] Updated presence step to ${toStep}`);

      // Publish step transition event
      const baseEvent = createBaseEvent({
        type: EVENT_TYPES.STEP_TRANSITIONED,
        sessionCode,
        participantId
      });
      
      const event: StepTransitionedEvent = {
        ...baseEvent,
        type: EVENT_TYPES.STEP_TRANSITIONED as typeof EVENT_TYPES.STEP_TRANSITIONED,
        payload: {
          fromStep,
          toStep,
          participantName
        }
      };

      console.log(`📤 [PublishStepTransition] Publishing event:`, event);
      await eventBus.publishEvent(event);
      console.log(`✅ [PublishStepTransition] Event published successfully`);
      
    } catch (error) {
      console.error('❌ [PublishStepTransition] Failed to publish event:', error);
      throw error;
    }
  };

  const publishParticipantJoined = useCallback(async () => {
    if (!eventBus || !ably) {
      console.warn('⚠️ EventBus or Ably not ready, cannot publish participant joined');
      return;
    }

    try {
      // First enter Ably presence for state persistence
      const sessionChannel = ably.getChannel(sessionCode, 'presence');
      const presenceData = {
        participantId,
        name: participantName,
        currentStep: 1,
        emoji: '🎯',
        color: 'blue',
        status: 'sorting',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      console.log(`📍 [PresenceSync] Entering presence for ${participantName}...`);
      await sessionChannel.presence.enter(presenceData);
      console.log(`✅ [PresenceSync] Entered presence successfully`);

      // Then publish the join event for real-time notification
      const baseEvent = createBaseEvent({
        type: EVENT_TYPES.PARTICIPANT_JOINED,
        sessionCode,
        participantId
      });
      
      const event: ParticipantJoinedEvent = {
        ...baseEvent,
        type: EVENT_TYPES.PARTICIPANT_JOINED as typeof EVENT_TYPES.PARTICIPANT_JOINED,
        payload: {
          participant: {
            id: participantId,
            name: participantName,
            emoji: '🎯', // Default emoji, could be customizable
            color: 'blue', // Default color, could be customizable
            joinedAt: new Date().toISOString(),
            currentStep: 1,
            status: 'sorting',
            cardStates: {
              step1: { more: [], less: [] },
              step2: { top8: [], less: [] },
              step3: { top3: [], less: [] }
            },
            revealed: { top8: false, top3: false },
            isViewing: null,
            isActive: true,
            lastActivity: new Date().toISOString()
          }
        }
      };

      await eventBus.publishEvent(event);
      
      if (config.enableDebugLogging !== false) {
        console.log(`📤 [EventDrivenSession] Published participant joined: ${participantName}`);
      }
    } catch (error) {
      console.error('❌ [EventDrivenSession] Failed to publish participant joined:', error);
      throw error;
    }
  }, [eventBus, ably, sessionCode, participantId, participantName, config.enableDebugLogging]);

  const publishParticipantLeft = useCallback(async () => {
    if (!eventBus) {
      console.warn('⚠️ EventBus not ready, cannot publish participant left');
      return;
    }

    try {
      const baseEvent = createBaseEvent({
        type: EVENT_TYPES.PARTICIPANT_LEFT,
        sessionCode,
        participantId
      });
      
      const event: ParticipantLeftEvent = {
        ...baseEvent,
        type: EVENT_TYPES.PARTICIPANT_LEFT as typeof EVENT_TYPES.PARTICIPANT_LEFT,
        payload: {
          participantName,
          leftAt: new Date().toISOString()
        }
      };

      await eventBus.publishEvent(event);
      
      if (config.enableDebugLogging !== false) {
        console.log(`📤 [EventDrivenSession] Published participant left: ${participantName}`);
      }
    } catch (error) {
      console.error('❌ [EventDrivenSession] Failed to publish participant left:', error);
      throw error;
    }
  }, [eventBus, sessionCode, participantId, participantName, config.enableDebugLogging]);

  const leaveSession = useCallback(async () => {
    console.log(`🚪 [LeaveSession] Starting cleanup for ${participantName}...`);
    
    try {
      // 1. Publish participant left event
      console.log(`📤 [LeaveSession] Publishing participant left event...`);
      await publishParticipantLeft();
      
      // 2. Leave Ably presence
      if (ably) {
        console.log(`📍 [LeaveSession] Leaving Ably presence...`);
        const sessionChannel = ably.getChannel(sessionCode, 'presence');
        await sessionChannel.presence.leave();
        console.log(`✅ [LeaveSession] Left Ably presence successfully`);
      }
      
      // 3. Clean up RevealManager
      if (revealManager) {
        console.log(`🧹 [LeaveSession] Cleaning up RevealManager...`);
        revealManager.cleanup();
      }
      
      // 4. Clean up session stores for this participant
      console.log(`🧹 [LeaveSession] Cleaning up stores for participant ${participantId}...`);
      sessionManager.cleanupParticipant(sessionCode, participantId);
      
      // 5. Clear participant localStorage
      if (typeof window !== 'undefined') {
        const storageKey = `participant-id-${sessionCode}-${participantName}`;
        localStorage.removeItem(storageKey);
        console.log(`🗑️ [LeaveSession] Cleared participant localStorage`);
      }
      
      console.log(`✅ [LeaveSession] Session cleanup completed successfully`);
    } catch (error) {
      console.error('❌ [LeaveSession] Failed to leave session cleanly:', error);
      // Continue with cleanup even if some steps fail
    }
  }, [publishParticipantLeft, ably, sessionCode, participantName, sessionManager, revealManager]);

  // Auto-sync session state and publish participant joined on connection
  useEffect(() => {
    if (isConnected && eventBus && participantName && ably) {
      const initializeSession = async () => {
        try {
          console.log(`🔄 [SessionSync] Synchronizing session state for ${participantName}...`);
          
          // Get the session channel for presence state
          const sessionChannel = ably.getChannel(sessionCode, 'presence');
          
          // Get current presence members to populate initial state
          const presenceMembers = await sessionChannel.presence.get();
          console.log(`📊 [SessionSync] Found ${presenceMembers.length} existing participants:`, presenceMembers.map(m => m.data?.name || 'Unknown'));
          
          // Populate participant steps from existing presence (filter out stale data)
          if (presenceMembers.length > 0) {
            const now = Date.now();
            const staleThreshold = 5 * 60 * 1000; // 5 minutes
            
            setParticipantSteps(prev => {
              const newSteps = new Map(prev);
              
              presenceMembers.forEach(member => {
                if (member.data && member.data.participantId && member.data.name) {
                  // Check for stale data
                  const lastActivity = member.data.lastActivity ? new Date(member.data.lastActivity).getTime() : 0;
                  const isStale = (now - lastActivity) > staleThreshold;
                  
                  if (isStale) {
                    console.log(`⚠️ [SessionSync] Skipping stale participant: ${member.data.name} (${Math.round((now - lastActivity) / 1000 / 60)}m old)`);
                    return;
                  }
                  
                  // Only add if not already present to prevent duplicates
                  if (!newSteps.has(member.data.participantId)) {
                    newSteps.set(member.data.participantId, {
                      currentStep: member.data.currentStep || 1,
                      participantName: member.data.name,
                      status: member.data.status || 'sorting'
                    });
                    console.log(`👤 [SessionSync] Added existing participant: ${member.data.name} (Step ${member.data.currentStep || 1}, Status: ${member.data.status || 'sorting'})`);
                  } else {
                    console.log(`🔄 [SessionSync] Participant already synced: ${member.data.name}`);
                  }
                }
              });
              
              console.log(`📊 [SessionSync] Total participants after sync: ${newSteps.size}`);
              return newSteps;
            });
          }
          
          // Now publish our own join event
          console.log(`📤 [SessionSync] Publishing join event for ${participantName}...`);
          await publishParticipantJoined();
          console.log(`✅ [SessionSync] Session synchronization complete for ${participantName}`);
          
        } catch (error) {
          console.error('❌ [SessionSync] Failed to sync session state:', error);
          // Still try to publish join event even if sync fails
          publishParticipantJoined().catch(console.error);
        }
      };

      // Small delay to ensure event system is ready
      const timer = setTimeout(initializeSession, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, eventBus, participantName, ably, sessionCode, publishParticipantJoined]);

  // Create participant display data compatible with old usePresence interface
  const participantsForDisplay = useMemo(() => {
    const display = new Map();
    participantSteps.forEach((stepData, pid) => {
      display.set(pid, {
        participantId: pid,
        name: stepData.participantName,
        currentStep: stepData.currentStep,
        emoji: '🎯', // Default emoji
        color: 'blue', // Default color
        status: stepData.status, // Use actual status from presence data
        isActive: true,
        lastActive: Date.now()
      });
    });
    return display;
  }, [participantSteps]);

  const currentUser = useMemo(() => ({
    participantId,
    name: participantName
  }), [participantId, participantName]);

  // Reveal functions
  const revealSelection = useCallback(async (revealType: 'top8' | 'top3', cardPositions: any[]) => {
    if (!revealManager) {
      console.warn('RevealManager not ready');
      return;
    }
    
    try {
      await revealManager.revealSelection(revealType, cardPositions);
      
      // Update presence status to show reveal state
      if (ably) {
        const sessionChannel = ably.getChannel(sessionCode, 'presence');
        const revealStatus = revealType === 'top8' ? 'revealed-8' : 'revealed-3';
        
        await sessionChannel.presence.update({
          participantId,
          name: participantName,
          currentStep: revealType === 'top8' ? 2 : 3, // Step 2 for top8, Step 3 for top3
          emoji: '🎯',
          color: 'blue',
          status: revealStatus,
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        });
        
        console.log(`📍 [PresenceSync] Updated presence status to ${revealStatus} for ${participantName}`);
      }
    } catch (error) {
      console.error('❌ [RevealSelection] Failed to reveal selection:', error);
      throw error;
    }
  }, [revealManager, ably, sessionCode, participantId, participantName]);

  const unrevealSelection = useCallback(async (revealType: 'top8' | 'top3') => {
    if (!revealManager) {
      console.warn('RevealManager not ready');
      return;
    }
    
    try {
      await revealManager.unrevealSelection(revealType);
      
      // Update presence status back to sorting
      if (ably) {
        const sessionChannel = ably.getChannel(sessionCode, 'presence');
        
        await sessionChannel.presence.update({
          participantId,
          name: participantName,
          currentStep: revealType === 'top8' ? 2 : 3, // Step 2 for top8, Step 3 for top3
          emoji: '🎯',
          color: 'blue',
          status: 'sorting',
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        });
        
        console.log(`📍 [PresenceSync] Updated presence status back to sorting for ${participantName}`);
      }
    } catch (error) {
      console.error('❌ [UnrevealSelection] Failed to unreveal selection:', error);
      throw error;
    }
  }, [revealManager, ably, sessionCode, participantId, participantName]);

  const isRevealed = useCallback((revealType: 'top8' | 'top3') => {
    if (!revealManager) return false;
    return revealManager.isRevealed(revealType);
  }, [revealManager]);

  const canReveal = useCallback((revealType: 'top8' | 'top3', cardCount: number) => {
    // Constraint logic: Step2 needs 8 cards for top8, Step3 needs 3 cards for top3
    if (revealType === 'top8') {
      return cardCount === 8;
    }
    if (revealType === 'top3') {
      return cardCount === 3;
    }
    return false;
  }, []);

  const onViewReveal = useCallback((targetParticipantId: string, revealType: 'revealed-8' | 'revealed-3') => {
    console.log(`👁️ Viewing ${revealType} for participant: ${targetParticipantId}`);
    
    // Navigate to viewer mode page with current user context
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams({
        viewerId: participantId,
        viewerName: encodeURIComponent(participantName)
      });
      window.location.href = `/canvas/${sessionCode}/view/${targetParticipantId}?${params.toString()}`;
    }
  }, [sessionCode, participantId, participantName]);

  // Create context value (memoized to prevent unnecessary re-renders)
  const contextValue = useMemo(() => {
    if (!eventBus) {
      // Return minimal context while services are initializing
      return {
        sessionManager,
        eventBus: null as any,
        viewerSync: null, // Not available during initialization
        viewerSyncArrangements: new Map(), // Empty during initialization
        sessionCode,
        participantId,
        participantName,
        publishStepTransition: async () => {},
        publishParticipantJoined: async () => {},
        publishParticipantLeft: async () => {},
        leaveSession: async () => {},
        isConnected: false,
        connectionError: 'Initializing event system...',
        participantSteps: new Map(),
        participantCount: 0, // No participants during initialization
        participantsForDisplay: new Map(),
        currentUser,
        onViewReveal,
        // Reveal functionality (disabled during initialization)
        revealManager: null,
        revealSelection: async () => {},
        unrevealSelection: async () => {},
        isRevealed: () => false,
        canReveal: () => false
      };
    }

    return {
      sessionManager,
      eventBus,
      viewerSync, // Expose ViewerSync instance
      viewerSyncArrangements, // Expose reactive arrangements state
      sessionCode,
      participantId,
      participantName,
      publishStepTransition,
      publishParticipantJoined,
      publishParticipantLeft,
      leaveSession,
      isConnected,
      connectionError,
      participantSteps,
      participantCount,
      participantsForDisplay,
      currentUser,
      onViewReveal,
      // Reveal functionality
      revealManager,
      revealSelection,
      unrevealSelection,
      isRevealed,
      canReveal
    };
  }, [
    sessionManager, 
    eventBus, 
    viewerSync,
    viewerSyncArrangements,
    sessionCode, 
    participantId, 
    participantName,
    publishStepTransition,
    publishParticipantJoined,
    publishParticipantLeft,
    leaveSession,
    isConnected, 
    connectionError,
    participantSteps,
    participantCount,
    participantsForDisplay,
    currentUser,
    onViewReveal,
    revealManager,
    revealSelection,
    unrevealSelection,
    isRevealed,
    canReveal
  ]);

  // Development debugging
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      // Add debug tools to window in development
      if (typeof window !== 'undefined') {
        (window as any).debugEventDrivenSession = {
          sessionManager,
          eventBus,
          sessionCode,
          participantId,
          participantName,
          logState: () => sessionManager.debugLogState(),
          getStats: () => sessionManager.getMemoryStats(),
          publishStepTransition,
          publishParticipantJoined
        };

        // Simple E2E test utilities - directly integrated with session-scoped stores
        (window as any).StateInjectionUtils = {
          injectRevealedParticipant: (participantName: string = 'Dave', revealType: 'top8' | 'top3' = 'top8') => {
            console.log(`🧪 [StateInjection] Setting up revealed ${revealType} for ${participantName}...`);
            
            // Use the session-scoped Step2 store to trigger a reveal
            const step2Store = sessionManager.getStep2Store(sessionCode, participantId);
            const state = step2Store.getState();
            
            // Ensure we have 8 cards in top8 pile for reveal to work
            if (state.top8Pile.length < 8) {
              // Create 8 test cards
              const testCards = Array.from({ length: 8 }, (_, i) => ({
                id: `test-card-${i}`,
                value_name: `Test Value ${i + 1}`,
                description: `Test description ${i + 1}`,
                position: { x: 0, y: 0 },
                pile: 'top8' as const
              }));

              step2Store.setState({
                top8Pile: testCards,
                deck: [],
                deckPosition: 8,
                stagingCard: null,
                lessImportantPile: []
              });
            }

            // Trigger reveal using the store's revealTop8 method
            setTimeout(async () => {
              try {
                await state.revealTop8();
                console.log(`✅ [StateInjection] ${participantName} now has revealed ${revealType}`);
              } catch (error) {
                console.error(`❌ [StateInjection] Failed to reveal for ${participantName}:`, error);
              }
            }, 100);

            return { participantName, revealType };
          },

          injectStep1Completion: () => {
            const step1Store = sessionManager.getStep1Store(sessionCode, participantId);
            
            // Create 8 more important and 8 less important cards
            const moreImportantCards = Array.from({ length: 8 }, (_, i) => ({
              id: `more-${i}`,
              value_name: `Important ${i + 1}`,
              description: `Important value ${i + 1}`,
              position: { x: 0, y: 0 },
              pile: 'more' as const
            }));

            const lessImportantCards = Array.from({ length: 8 }, (_, i) => ({
              id: `less-${i}`,
              value_name: `Less Important ${i + 1}`,
              description: `Less important value ${i + 1}`,
              position: { x: 0, y: 0 },
              pile: 'less' as const
            }));

            step1Store.setState({
              deck: [...moreImportantCards, ...lessImportantCards],
              deckPosition: 16, // All cards processed
              stagingCard: null,
              moreImportantPile: moreImportantCards,
              lessImportantPile: lessImportantCards,
              isDragging: false,
              draggedCardId: null,
              showOverflowWarning: false,
            });

            console.log('✅ [StateInjection] Step 1 completion state injected');
            return { moreImportantCards, lessImportantCards };
          },

          injectStep2Completion: () => {
            const step2Store = sessionManager.getStep2Store(sessionCode, participantId);
            
            const top8Cards = Array.from({ length: 8 }, (_, i) => ({
              id: `top8-${i}`,
              value_name: `Top ${i + 1}`,
              description: `Top value ${i + 1}`,
              position: { x: 0, y: 0 },
              pile: 'top8' as const
            }));

            step2Store.setState({
              deck: [],
              deckPosition: 8,
              stagingCard: null,
              top8Pile: top8Cards,
              lessImportantPile: [],
              isDragging: false,
              draggedCardId: null,
              showOverflowWarning: false,
            });

            console.log('✅ [StateInjection] Step 2 completion state injected');
            return { top8Cards };
          }
        };
      }
      
      return () => {
        if (typeof window !== 'undefined') {
          delete (window as any).debugEventDrivenSession;
          delete (window as any).StateInjectionUtils;
        }
      };
    }, [sessionManager, eventBus, sessionCode, participantId]);
  }

  // Create the old SessionStore context value for backward compatibility
  const sessionStoreContextValue = useMemo(() => ({
    sessionManager,
    sessionCode,
    participantId
  }), [sessionManager, sessionCode, participantId]);

  return (
    <EventDrivenSessionContext.Provider value={contextValue}>
      <SessionStoreContext.Provider value={sessionStoreContextValue}>
        {children}
      </SessionStoreContext.Provider>
    </EventDrivenSessionContext.Provider>
  );
};

/**
 * useEventDrivenSession - Hook to access event-driven session context
 */
export function useEventDrivenSession(): EventDrivenSessionContextValue {
  const context = useContext(EventDrivenSessionContext);
  
  if (!context) {
    throw new Error(
      'useEventDrivenSession must be used within EventDrivenSessionProvider. ' +
      'Wrap your app with <EventDrivenSessionProvider sessionCode="..." participantId="..." participantName="...">.'
    );
  }
  
  return context;
}

/**
 * useEventPublisher - Hook for publishing events
 */
export function useEventPublisher() {
  const { publishStepTransition, publishParticipantJoined, isConnected } = useEventDrivenSession();
  
  return {
    publishStepTransition,
    publishParticipantJoined,
    isConnected
  };
}

/**
 * useSessionStoreContext - Backward compatibility hook for existing session store hooks
 * 
 * This ensures existing hooks like useSessionStep1Store continue to work with the new
 * event-driven provider without modification.
 */
export function useSessionStoreContext(): SessionStoreContextValue {
  const context = useContext(SessionStoreContext);
  
  if (!context) {
    throw new Error(
      'useSessionStoreContext must be used within SessionStoreProvider. ' +
      'Wrap your app with <SessionStoreProvider sessionCode="..." participantId="...">. ' +
      'This is required to prevent state bleeding between participants.'
    );
  }
  
  return context;
}
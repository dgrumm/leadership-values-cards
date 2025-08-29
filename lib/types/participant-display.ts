/**
 * Hybrid participant data structure that combines authoritative session data 
 * with real-time presence data for consistent UI display
 */

import type { PresenceData } from '../presence/types';
import type { Participant } from './participant';

/**
 * Participant data for UI display that merges session (authoritative) and presence (real-time) data
 * 
 * Data Source Rules:
 * - Identity (emoji, color): From session (authoritative, consistent across observers)  
 * - Step progress: From session (authoritative, prevents race conditions)
 * - Real-time status: From presence (immediate updates)
 * - Activity: From presence (immediate updates)
 */
export interface ParticipantDisplayData {
  // Unique identifiers
  participantId: string;
  name: string;
  
  // Identity data (FROM SESSION - authoritative source)
  emoji: string;
  color: string;
  
  // Progress data (FROM SESSION - authoritative source)
  currentStep: 1 | 2 | 3; // Always from session to prevent step inconsistencies
  
  // Real-time data (FROM PRESENCE - immediate updates)
  status: 'sorting' | 'revealed-8' | 'revealed-3' | 'completed';
  lastActive: number;
  isViewing: string | null;
  
  // Metadata
  isCurrentUser: boolean;
  joinedAt: string; // From session
}

/**
 * Creates display data by merging session participant with presence data
 */
export function createParticipantDisplayData(
  sessionParticipant: Participant,
  presenceData: PresenceData | null,
  currentUserId: string
): ParticipantDisplayData {
  return {
    // Identity from session (single source of truth)
    participantId: sessionParticipant.id,
    name: sessionParticipant.name,
    emoji: sessionParticipant.emoji,
    color: sessionParticipant.color,
    
    // Progress from session (authoritative)
    currentStep: sessionParticipant.currentStep,
    joinedAt: sessionParticipant.joinedAt,
    
    // Real-time data from presence (fallback to session if not available)
    status: presenceData?.status || sessionParticipant.status,
    lastActive: presenceData?.lastActive || new Date(sessionParticipant.lastActivity).getTime(),
    isViewing: presenceData?.isViewing || null,
    
    // Metadata
    isCurrentUser: sessionParticipant.id === currentUserId
  };
}

/**
 * Creates display data from presence when session participant is not available
 * (fallback case - should be rare in normal operation)
 */
export function createParticipantDisplayDataFromPresence(
  presenceData: PresenceData,
  currentUserId: string
): ParticipantDisplayData {
  console.warn(`⚠️ Creating display data from presence only for ${presenceData.name} - session data unavailable`);
  
  return {
    participantId: presenceData.participantId,
    name: presenceData.name,
    
    // Identity from presence (fallback - may be inconsistent)
    emoji: presenceData.emoji,
    color: presenceData.color,
    
    // Progress from presence (fallback - may be stale)
    currentStep: presenceData.currentStep,
    joinedAt: new Date().toISOString(), // Unknown, use current time
    
    // Real-time data from presence
    status: presenceData.status,
    lastActive: presenceData.lastActive,
    isViewing: presenceData.isViewing,
    
    // Metadata
    isCurrentUser: presenceData.participantId === currentUserId
  };
}
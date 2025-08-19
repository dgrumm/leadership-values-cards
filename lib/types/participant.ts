import { Card } from './card';

// Cold data - changes infrequently, stable for duration of session
export interface ParticipantProfile {
  name: string;
  emoji: string;
  color: string;
  joinedAt: string;
}

// Hot data - changes frequently during active participation  
export interface ParticipantPresence {
  currentStep: ParticipantStep;
  status: ParticipantStatus;
  cardStates: ParticipantCardStates;
  revealed: ParticipantRevealState;
  isViewing: string | null;
  lastActivity: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}

// Combined interface for backward compatibility and full participant data
export interface Participant extends ParticipantProfile, ParticipantPresence {}

export type ParticipantStep = 1 | 2 | 3;

export type ParticipantStatus = 
  | 'sorting'
  | 'revealed-8'
  | 'revealed-3'
  | 'completed';

export interface ParticipantCardStates {
  step1: {
    more: Card[];
    less: Card[];
  };
  step2: {
    top8: Card[];
    less: Card[];
  };
  step3: {
    top3: Card[];
    less: Card[];
  };
}

export interface ParticipantRevealState {
  top8: boolean;
  top3: boolean;
}

// Lightweight presence data for real-time updates (cursors, status)
export interface ParticipantRealTimePresence {
  name: string; // Identifier only
  cursor: { x: number; y: number };
  lastSeen: string;
  isActive: boolean;
}

// Full presence including session state (less frequent updates)
export interface ParticipantSessionPresence extends ParticipantRealTimePresence {
  currentStep: ParticipantStep;
  status: ParticipantStatus;
}

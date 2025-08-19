import { Card } from './card';

export interface Participant {
  name: string;
  emoji: string;
  color: string;
  joinedAt: string;
  currentStep: ParticipantStep;
  status: ParticipantStatus;
  cardStates: ParticipantCardStates;
  revealed: ParticipantRevealState;
  isViewing: string | null;
  lastActivity: string;
}

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

export interface ParticipantPresence {
  name: string;
  emoji: string;
  color: string;
  currentStep: ParticipantStep;
  status: ParticipantStatus;
  lastSeen: string;
  isActive: boolean;
}

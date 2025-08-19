import { Participant } from './participant';

export interface Session {
  sessionCode: string;
  createdAt: string;
  lastActivity: string;
  deckType: DeckType;
  maxParticipants: number;
  participants: Participant[];
  isActive: boolean;
  expiresAt: string;
}

export type DeckType = 'dev' | 'professional' | 'extended';

export interface SessionConfig {
  maxParticipants: number;
  timeoutMinutes: number;
  warningMinutes: number;
  deckType: DeckType;
}

export interface SessionMetadata {
  sessionCode: string;
  participantCount: number;
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
  timeRemaining?: number;
}

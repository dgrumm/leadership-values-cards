import { Card } from '../types/card';
import { Participant } from '../types/participant';

export interface RevealedSelections {
  top8?: Card[];
  top3?: Card[];
}

export interface RevealResult {
  success: boolean;
  error?: string;
}

export interface ViewerState {
  targetParticipantId: string;
  revealType: 'top8' | 'top3';
  startTime: number;
  isActive: boolean;
  cards: Card[] | null;
  participant: Participant | null;
}

export interface ViewerResult {
  success: boolean;
  error?: string;
  viewerState?: ViewerState;
}

export interface AvailableReveal {
  participant: Participant;
  hasTop8: boolean;
  hasTop3: boolean;
}

export interface RevealStatus {
  participantId: string;
  participantName: string;
  emoji: string;
  color: string;
  top8Revealed: boolean;
  top3Revealed: boolean;
}
import { Card, CardPile } from './card';
import { Participant, ParticipantStep } from './participant';

export interface GameState {
  sessionCode: string;
  participants: Record<string, Participant>;
  deck: Card[];
  piles: Record<CardPile, PileState>;
  currentViewers: Record<string, ViewerState>;
  canvasState: CanvasState;
  lastUpdated: string;
}

export interface PileState {
  cards: Card[];
  maxCapacity?: number;
  isVisible: boolean;
  owner?: string;
}

export interface ViewerState {
  participantName: string;
  viewingTarget: string;
  startedAt: string;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
}

export interface GameProgress {
  sessionCode: string;
  totalParticipants: number;
  stepProgress: Record<ParticipantStep, number>;
  completedCount: number;
  revealedCount: {
    top8: number;
    top3: number;
  };
}

export interface GameAction {
  type: GameActionType;
  participantName: string;
  payload: any;
  timestamp: string;
  sessionCode: string;
}

export type GameActionType = 
  | 'CARD_MOVE'
  | 'STEP_ADVANCE'
  | 'REVEAL_CARDS'
  | 'JOIN_SESSION'
  | 'LEAVE_SESSION'
  | 'START_VIEWING'
  | 'STOP_VIEWING';

import { Card, CardPile } from './card';
import { 
  Participant, 
  ParticipantProfile, 
  ParticipantPresence,
  ParticipantRealTimePresence,
  ParticipantStep 
} from './participant';

// Optimized game state with separated hot/cold data
export interface OptimizedGameState {
  sessionCode: string;
  
  // Cold data - participant profiles (rarely change)
  participantProfiles: Map<string, ParticipantProfile>;
  
  // Hot data - frequently updated presence info
  participantPresence: Map<string, ParticipantPresence>;
  
  // Very hot data - real-time cursors (50ms updates)
  participantCursors: Map<string, ParticipantRealTimePresence>;
  
  deck: Card[];
  piles: Record<CardPile, PileState>;
  currentViewers: Record<string, ViewerState>;
  canvasState: CanvasState;
  lastUpdated: string;
}

// Backward compatible interface
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
  payload: Record<string, unknown>;
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

export interface ViewerData {
  participantId: string;
  name: string;
  emoji: string;
  color: string;
  joinedAt: number;
  isActive: boolean;
}

export interface ViewerState {
  currentViewTarget: string | null;
  viewers: Map<string, ViewerData>;
  isViewing: boolean;
}

export interface ArrangementViewData {
  participantId: string;
  participantName: string;
  revealType: 'top8' | 'top3';
  cardPositions: Array<{
    cardId: string;
    x: number;
    y: number;
    pile: string;
    card?: {
      id: string;
      value_name: string;
      description: string;
      position: { x: number; y: number };
      pile: string;
    };
  }>;
  lastUpdated: number;
}

export interface ViewerModeProps {
  sessionCode: string;
  participantId: string;
}

export interface ViewerPresenceData {
  viewerId: string;
  viewerName: string;
  viewerEmoji: string;
  viewerColor: string;
  targetParticipantId: string;
  joinedAt: number;
}
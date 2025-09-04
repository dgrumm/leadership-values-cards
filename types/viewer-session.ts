import type { ArrangementViewData, ViewerData } from './viewer';

export interface ViewerIdentity {
  participantId: string;
  name: string;
  emoji?: string;
  color?: string;
}

export interface ViewerSessionState {
  sessionCode: string;
  viewerIdentity: ViewerIdentity;
  targetParticipantId: string;
  isConnected: boolean;
  connectionError: string | null;
  
  // Current arrangement being viewed
  arrangement: ArrangementViewData | null;
  isArrangementLoading: boolean;
  arrangementError: string | null;
  
  // Other viewers viewing the same arrangement
  otherViewers: ViewerData[];
  viewerCount: number;
}

export interface ViewerSessionContextType extends ViewerSessionState {
  // Navigation
  exitViewer: () => void;
  
  // Viewer presence (internal tracking)
  joinViewer: () => Promise<void>;
  leaveViewer: () => Promise<void>;
  
  // Real-time arrangement updates
  refreshArrangement: () => Promise<void>;
}

// Re-export types that viewers need
export type { ViewerData, ArrangementViewData } from './viewer';
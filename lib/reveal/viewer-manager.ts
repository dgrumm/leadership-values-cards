import { createRevealManager, RevealManager } from './reveal-manager';
import { ViewerState, ViewerResult, AvailableReveal } from './types';

/**
 * ViewerManager handles viewing other participants' revealed selections.
 * 
 * Architecture:
 * - Read-only access to revealed selections from session data
 * - Presence tracking for who's viewing whom (ephemeral)
 * - Integration with existing hybrid presence system
 */
export class ViewerManager {
  private revealManager: RevealManager;
  private currentView: ViewerState | null = null;

  constructor(
    private sessionCode: string,
    private viewerParticipantId: string
  ) {
    this.revealManager = createRevealManager(sessionCode, viewerParticipantId);
  }

  /**
   * Enter viewer mode to see a participant's revealed selection
   */
  async enterViewMode(
    targetParticipantId: string, 
    revealType: 'top8' | 'top3'
  ): Promise<ViewerResult> {
    try {
      // Check if target participant has revealed this selection
      const isRevealed = await this.revealManager.isRevealed(revealType, targetParticipantId);
      if (!isRevealed) {
        return {
          success: false,
          error: `Participant has not revealed their ${revealType} selection`
        };
      }

      // Get the revealed cards
      const cards = await this.revealManager.getRevealedSelection(targetParticipantId, revealType);
      if (!cards || cards.length === 0) {
        return {
          success: false,
          error: 'No revealed cards found'
        };
      }

      // Get participant information (will be needed for display)
      const participant = await this.getParticipant(targetParticipantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found'
        };
      }

      // Create viewer state
      const viewerState: ViewerState = {
        targetParticipantId,
        revealType,
        startTime: Date.now(),
        isActive: true,
        cards,
        participant
      };

      this.currentView = viewerState;

      return {
        success: true,
        viewerState
      };

    } catch (error) {
      console.error('Error entering view mode:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enter view mode'
      };
    }
  }

  /**
   * Exit viewer mode
   */
  async exitViewMode(): Promise<ViewerResult> {
    if (!this.currentView) {
      return { success: true }; // Already not viewing
    }

    try {
      // Clear current view
      this.currentView = null;

      return { success: true };

    } catch (error) {
      console.error('Error exiting view mode:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to exit view mode'
      };
    }
  }

  /**
   * Get current viewer state
   */
  getCurrentView(): ViewerState | null {
    return this.currentView;
  }

  /**
   * Check if currently in viewer mode
   */
  isViewingActive(): boolean {
    return this.currentView?.isActive || false;
  }

  /**
   * Get viewing duration in milliseconds
   */
  getViewingDuration(): number {
    if (!this.currentView) {
      return 0;
    }
    return Date.now() - this.currentView.startTime;
  }

  /**
   * Refresh the current view (reload cards in case they changed)
   * Note: In the hybrid architecture, revealed selections are snapshots,
   * so this would only change if the owner re-reveals their selection
   */
  async refreshCurrentView(): Promise<ViewerResult> {
    if (!this.currentView) {
      return {
        success: false,
        error: 'No active view to refresh'
      };
    }

    // Get updated cards
    const updatedCards = await this.revealManager.getRevealedSelection(
      this.currentView.targetParticipantId,
      this.currentView.revealType
    );

    if (!updatedCards) {
      // Selection is no longer revealed - exit viewer mode
      await this.exitViewMode();
      return {
        success: false,
        error: 'Selection is no longer available'
      };
    }

    // Update current view with refreshed data
    this.currentView = {
      ...this.currentView,
      cards: updatedCards
    };

    return {
      success: true,
      viewerState: this.currentView
    };
  }

  /**
   * Get participant data for display purposes
   */
  private async getParticipant(participantId: string) {
    try {
      const session = await this.revealManager.getSession();
      if (!session) {
        return null;
      }

      return session.participants.find(p => p.id === participantId) || null;
    } catch (error) {
      console.error('Error getting participant:', error);
      return null;
    }
  }

  /**
   * Get all participants who have revealed selections (for navigation)
   */
  async getAvailableReveals(): Promise<AvailableReveal[]> {
    try {
      const session = await this.revealManager.getSession();
      if (!session) {
        return [];
      }

      const availableReveals = [];
      
      for (const participant of session.participants) {
        const hasTop8 = participant.revealed?.top8 || false;
        const hasTop3 = participant.revealed?.top3 || false;
        
        if (hasTop8 || hasTop3) {
          availableReveals.push({
            participant,
            hasTop8,
            hasTop3
          });
        }
      }

      return availableReveals;
    } catch (error) {
      console.error('Error getting available reveals:', error);
      return [];
    }
  }

  /**
   * Switch to viewing a different participant's reveal without exiting first
   */
  async switchToView(
    targetParticipantId: string,
    revealType: 'top8' | 'top3'
  ): Promise<ViewerResult> {
    // Exit current view first
    await this.exitViewMode();
    
    // Enter new view
    return await this.enterViewMode(targetParticipantId, revealType);
  }
}

/**
 * Factory function to create viewer manager instances
 */
export function createViewerManager(sessionCode: string, viewerParticipantId: string): ViewerManager {
  return new ViewerManager(sessionCode, viewerParticipantId);
}
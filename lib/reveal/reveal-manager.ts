import { Card } from '../types/card';
import { Session } from '../types/session';
import { getSessionManager } from '../session/session-manager';
import { getSessionStoreManager } from '../stores/session-store-manager';
import { getSessionStore } from '../session/session-store';
import { RevealedSelections, RevealResult } from './types';

/**
 * RevealManager handles revealing participant selections using the hybrid architecture.
 * 
 * Architecture:
 * - Card positions: Retrieved from session-scoped stores (source of truth for arrangements)
 * - Reveal status: Stored in session participant data (persistent)
 * - Real-time updates: Handled via presence system (ephemeral status broadcasting)
 */
export class RevealManager {
  private sessionManager = getSessionManager();
  private storeManager = getSessionStoreManager();
  private sessionStore = getSessionStore();

  constructor(
    private sessionCode: string,
    private participantId: string
  ) {}

  /**
   * Reveal a participant's top 8 or top 3 selection
   * 
   * Flow:
   * 1. Get current card positions from session-scoped store
   * 2. Store revealed selection in session participant data (authoritative)
   * 3. Update reveal status flag (persistent)
   * 4. Presence system will handle real-time status broadcasting separately
   */
  async revealSelection(type: 'top8' | 'top3'): Promise<RevealResult> {
    try {
      // 1. Get current card positions from session-scoped store
      const cards = await this.getCardsForReveal(type);
      
      if (!cards || cards.length === 0) {
        return {
          success: false,
          error: `No ${type} cards found. Complete your selection first.`
        };
      }

      // Validate card count
      const expectedCount = type === 'top8' ? 8 : 3;
      if (cards.length !== expectedCount) {
        return {
          success: false,
          error: `Expected ${expectedCount} cards but found ${cards.length}. Please complete your ${type} selection.`
        };
      }

      // 2. Store revealed selection in session participant data
      const session = await this.sessionManager.getSession(this.sessionCode);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      const participantIndex = session.participants.findIndex(p => p.id === this.participantId);
      if (participantIndex === -1) {
        return { success: false, error: 'Participant not found in session' };
      }

      // 3. Update participant with revealed selection and status
      const updatedParticipants = [...session.participants];
      const participant = updatedParticipants[participantIndex];
      
      // Store the revealed cards in participant data
      if (!participant.cardStates) {
        participant.cardStates = {
          step1: { more: [], less: [] },
          step2: { top8: [], less: [] },
          step3: { top3: [], less: [] }
        };
      }

      // Update the appropriate revealed selection
      if (type === 'top8') {
        participant.cardStates.step2.top8 = cards;
        participant.revealed.top8 = true;
        participant.status = 'revealed-8';
      } else {
        participant.cardStates.step3.top3 = cards;
        participant.revealed.top3 = true;
        participant.status = 'revealed-3';
      }

      participant.lastActivity = new Date().toISOString();

      // Update session with new participant data
      const updatedSession = await this.sessionStore.updateSession(this.sessionCode, {
        participants: updatedParticipants,
        lastActivity: new Date().toISOString()
      });

      if (!updatedSession) {
        return { success: false, error: 'Failed to update session' };
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error revealing selection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reveal selection'
      };
    }
  }

  /**
   * Hide a previously revealed selection
   */
  async unrevelSelection(type: 'top8' | 'top3'): Promise<RevealResult> {
    try {
      const session = await this.sessionManager.getSession(this.sessionCode);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      const participantIndex = session.participants.findIndex(p => p.id === this.participantId);
      if (participantIndex === -1) {
        return { success: false, error: 'Participant not found in session' };
      }

      const updatedParticipants = [...session.participants];
      const participant = updatedParticipants[participantIndex];

      // Clear reveal status
      participant.revealed[type] = false;
      
      // Update status if no longer revealing anything
      if (!participant.revealed.top8 && !participant.revealed.top3) {
        participant.status = 'sorting';
      } else if (type === 'top8' && participant.revealed.top3) {
        participant.status = 'revealed-3';
      } else if (type === 'top3' && participant.revealed.top8) {
        participant.status = 'revealed-8';
      }

      participant.lastActivity = new Date().toISOString();

      // Update session
      const updatedSession = await this.sessionStore.updateSession(this.sessionCode, {
        participants: updatedParticipants,
        lastActivity: new Date().toISOString()
      });

      if (!updatedSession) {
        return { success: false, error: 'Failed to update session' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error unrevealing selection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unreveal selection'
      };
    }
  }

  /**
   * Get revealed selection for a participant (for viewing)
   */
  async getRevealedSelection(targetParticipantId: string, type: 'top8' | 'top3'): Promise<Card[] | null> {
    try {
      const session = await this.sessionManager.getSession(this.sessionCode);
      if (!session) {
        return null;
      }

      const participant = session.participants.find(p => p.id === targetParticipantId);
      if (!participant || !participant.revealed[type]) {
        return null;
      }

      // Return the stored revealed selection
      if (type === 'top8') {
        return participant.cardStates?.step2?.top8 || null;
      } else {
        return participant.cardStates?.step3?.top3 || null;
      }
    } catch (error) {
      console.error('Error getting revealed selection:', error);
      return null;
    }
  }

  /**
   * Check if a participant has revealed their selection
   */
  async isRevealed(type: 'top8' | 'top3', targetParticipantId?: string): Promise<boolean> {
    try {
      const session = await this.sessionManager.getSession(this.sessionCode);
      if (!session) {
        return false;
      }

      const participantId = targetParticipantId || this.participantId;
      const participant = session.participants.find(p => p.id === participantId);
      
      return participant?.revealed[type] || false;
    } catch (error) {
      console.error('Error checking reveal status:', error);
      return false;
    }
  }

  /**
   * Get session data for external access (used by viewer manager)
   */
  async getSession(): Promise<Session | null> {
    return this.sessionManager.getSession(this.sessionCode);
  }

  /**
   * Get current card positions from session-scoped store
   */
  private async getCardsForReveal(type: 'top8' | 'top3'): Promise<Card[] | null> {
    try {
      const stores = this.storeManager.getStores(this.sessionCode, this.participantId);
      
      if (type === 'top8') {
        const step2Store = stores.step2;
        return step2Store.getState().topEightPile;
      } else {
        const step3Store = stores.step3;
        return step3Store.getState().topThreePile;
      }
    } catch (error) {
      console.error('Error getting cards for reveal:', error);
      return null;
    }
  }
}

/**
 * Factory function to create reveal manager instances
 */
export function createRevealManager(sessionCode: string, participantId: string): RevealManager {
  return new RevealManager(sessionCode, participantId);
}
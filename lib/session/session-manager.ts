import { Session, Participant, SessionConfig } from '../types';
import { getSessionStore } from './session-store';
import { 
  validateSessionCode, 
  validateParticipantName, 
  resolveNameConflict, 
  sanitizeParticipantName,
  sanitizeSessionCode,
  SESSION_VALIDATION_ERRORS,
  ValidationResult 
} from './session-validator';
import { PARTICIPANT_EMOJIS, PARTICIPANT_COLORS } from '../constants/participants';
import { generateUniqueId, createTimestamp } from '../utils/generators';

export interface CreateSessionResult {
  success: boolean;
  session?: Session;
  participant?: Participant;
  error?: string;
}

export interface JoinSessionResult {
  success: boolean;
  session?: Session;
  participant?: Participant;
  error?: string;
}

export interface LeaveSessionResult {
  success: boolean;
  sessionDeleted: boolean;
  error?: string;
}

export class SessionManager {
  private store = getSessionStore();

  async createSession(config?: Partial<SessionConfig>, customCode?: string): Promise<CreateSessionResult> {
    try {
      const session = await this.store.createSession(config, customCode);
      return { success: true, session };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create session' 
      };
    }
  }

  /**
   * Create a new session and immediately add the creator as the first participant
   */
  async createSessionWithCreator(
    creatorName: string, 
    config?: Partial<SessionConfig>,
    customCode?: string
  ): Promise<CreateSessionResult> {
    try {
      // Create the session first
      const sessionResult = await this.createSession(config, customCode);
      if (!sessionResult.success || !sessionResult.session) {
        return sessionResult;
      }

      // Add creator as first participant
      const joinResult = await this.joinSession(sessionResult.session.sessionCode, creatorName);
      if (!joinResult.success) {
        // If join fails, clean up the session
        await this.store.deleteSession(sessionResult.session.sessionCode);
        return { 
          success: false, 
          error: joinResult.error || 'Failed to add creator to session' 
        };
      }

      return {
        success: true,
        session: joinResult.session,
        participant: joinResult.participant
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create session with creator' 
      };
    }
  }

  /**
   * Atomically join a session or create it if it doesn't exist
   * Prevents race conditions where multiple users try to create the same session
   */
  async joinOrCreateSession(
    sessionCode: string, 
    participantName: string, 
    config?: Partial<SessionConfig>
  ): Promise<JoinSessionResult> {
    // Sanitize and validate inputs
    const sanitizedCode = sanitizeSessionCode(sessionCode);
    const codeValidation = validateSessionCode(sanitizedCode);
    if (!codeValidation.isValid) {
      return { success: false, error: codeValidation.error };
    }

    const sanitizedName = sanitizeParticipantName(participantName);
    const nameValidation = validateParticipantName(sanitizedName);
    if (!nameValidation.isValid) {
      return { success: false, error: nameValidation.error };
    }

    try {
      // First, try to join existing session
      const existingSession = await this.getSession(sanitizedCode);
      if (existingSession) {
        // Session exists, try to join it
        return await this.joinSession(sanitizedCode, sanitizedName);
      }

      // Session doesn't exist, create it atomically
      const atomicResult = await this.store.createSessionIfNotExists(sanitizedCode, config);
      
      if (!atomicResult.created) {
        // Another user just created the session, try to join it
        return await this.joinSession(sanitizedCode, sanitizedName);
      }

      // We successfully created the session, now join it as the first participant
      const joinResult = await this.joinSession(sanitizedCode, sanitizedName);
      if (!joinResult.success) {
        // If join fails, clean up the session we just created
        await this.store.deleteSession(sanitizedCode);
        return {
          success: false,
          error: joinResult.error || 'Failed to join newly created session'
        };
      }

      return {
        success: true,
        session: joinResult.session,
        participant: joinResult.participant
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join or create session'
      };
    }
  }

  async getSession(sessionCode: string): Promise<Session | null> {
    const sanitizedCode = sanitizeSessionCode(sessionCode);
    const validation = validateSessionCode(sanitizedCode);
    if (!validation.isValid) {
      return null;
    }
    
    const session = await this.store.getSession(sanitizedCode);
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (!session.isActive || new Date(session.expiresAt) <= new Date()) {
      return null;
    }
    
    return session;
  }

  async joinSession(sessionCode: string, participantName: string): Promise<JoinSessionResult> {
    // Sanitize and validate session code
    const sanitizedCode = sanitizeSessionCode(sessionCode);
    const codeValidation = validateSessionCode(sanitizedCode);
    if (!codeValidation.isValid) {
      return { success: false, error: codeValidation.error };
    }

    // Get session
    const session = await this.getSession(sanitizedCode);
    if (!session) {
      return { success: false, error: SESSION_VALIDATION_ERRORS.SESSION_NOT_FOUND };
    }

    // Check if session is expired
    if (!session.isActive || new Date(session.expiresAt) <= new Date()) {
      return { success: false, error: SESSION_VALIDATION_ERRORS.SESSION_EXPIRED };
    }

    // Check participant limit
    if (session.participants.length >= session.maxParticipants) {
      return { success: false, error: SESSION_VALIDATION_ERRORS.SESSION_FULL };
    }

    // Validate and sanitize participant name
    const sanitizedName = sanitizeParticipantName(participantName);
    const nameValidation = validateParticipantName(sanitizedName);
    if (!nameValidation.isValid) {
      return { success: false, error: nameValidation.error };
    }

    // Resolve name conflicts
    const existingNames = new Set(session.participants.map(p => p.name));
    const resolvedName = resolveNameConflict(sanitizedName, existingNames);

    // Assign random emoji and color  
    const emoji = PARTICIPANT_EMOJIS[Math.floor(Math.random() * PARTICIPANT_EMOJIS.length)];
    const color = PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];

    // Create participant
    const participant: Participant = {
      id: generateUniqueId('participant'),
      name: resolvedName,
      emoji,
      color,
      joinedAt: createTimestamp(),
      isActive: true,
      currentStep: 1,
      status: 'sorting',
      cardStates: {
        step1: { more: [], less: [] },
        step2: { top8: [], less: [] },
        step3: { top3: [], less: [] }
      },
      revealed: { top8: false, top3: false },
      isViewing: null,
      lastActivity: createTimestamp()
    };

    // Add participant to session
    const updatedSession = await this.store.updateSession(sessionCode, {
      participants: [...session.participants, participant],
      lastActivity: createTimestamp()
    });

    if (!updatedSession) {
      return { success: false, error: 'Failed to update session' };
    }

    // Update session activity
    await this.store.updateLastActivity(sessionCode);

    return { 
      success: true, 
      session: updatedSession, 
      participant 
    };
  }

  async leaveSession(sessionCode: string, participantId: string): Promise<LeaveSessionResult> {
    const session = await this.getSession(sessionCode);
    if (!session) {
      return { success: false, sessionDeleted: false, error: SESSION_VALIDATION_ERRORS.SESSION_NOT_FOUND };
    }

    // Remove participant
    const updatedParticipants = session.participants.filter(p => p.id !== participantId);
    
    // If no participants left, delete the session
    if (updatedParticipants.length === 0) {
      await this.store.deleteSession(sessionCode);
      return { success: true, sessionDeleted: true };
    }

    // Update session with remaining participants
    await this.store.updateSession(sessionCode, {
      participants: updatedParticipants,
      lastActivity: createTimestamp()
    });

    return { success: true, sessionDeleted: false };
  }

  async updateParticipantActivity(sessionCode: string, participantId: string, currentStep?: number): Promise<boolean> {
    const session = await this.getSession(sessionCode);
    if (!session) {
      return false;
    }

    const participantIndex = session.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) {
      return false;
    }

    // Update participant
    const updatedParticipants = [...session.participants];
    updatedParticipants[participantIndex] = {
      ...updatedParticipants[participantIndex],
      lastActivity: createTimestamp(),
      ...(currentStep !== undefined && { currentStep })
    };

    // Update session
    await this.store.updateSession(sessionCode, {
      participants: updatedParticipants,
      lastActivity: createTimestamp()
    });

    // Update session activity timer
    await this.store.updateLastActivity(sessionCode);

    return true;
  }

  async getSessionMetadata(sessionCode: string) {
    const sessions = await this.store.getAllActiveSessions();
    return sessions.find(s => s.sessionCode === sessionCode);
  }

  async getCurrentParticipant(sessionCode: string, participantName: string): Promise<Participant | null> {
    const session = await this.getSession(sessionCode);
    if (!session) {
      return null;
    }
    
    return session.participants.find(p => p.name === participantName && p.isActive) || null;
  }

  async cleanupExpiredSessions(): Promise<string[]> {
    return this.store.cleanupExpiredSessions();
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}

export function resetSessionManager(): void {
  sessionManager = null;
}
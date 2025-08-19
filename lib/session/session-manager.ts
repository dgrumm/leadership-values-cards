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
import { getUniqueEmojiAndColor } from '../constants/participants';
import { generateUniqueId, createTimestamp } from '../utils/generators';

export interface CreateSessionResult {
  success: boolean;
  session?: Session;
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

  async createSession(config?: Partial<SessionConfig>): Promise<CreateSessionResult> {
    try {
      const session = await this.store.createSession(config);
      return { success: true, session };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create session' 
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

    // Get unique emoji and color
    const { emoji, color } = getUniqueEmojiAndColor(session.participants);

    // Create participant
    const participant: Participant = {
      id: generateUniqueId('participant'),
      name: resolvedName,
      emoji,
      color,
      joinedAt: createTimestamp(),
      isActive: true,
      currentStep: 1,
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
      ...(currentStep && { currentStep })
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
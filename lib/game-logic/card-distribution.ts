import { Card, CardDefinition, CardPile } from '../types/card';
import { generateParticipantDeck, validateDeckCompleteness } from './shuffle';
import { generateUniqueId, generateSessionCode } from '../utils/generators';

export interface ParticipantDeck {
  participantName: string;
  cards: Card[];
  totalCards: number;
  createdAt: number;
}

export interface DistributionResult {
  success: boolean;
  participants: ParticipantDeck[];
  errors: string[];
  sessionId: string;
}

export class CardDistribution {
  private static readonly DEFAULT_POSITION = { x: 0, y: 0 };
  private static readonly DEFAULT_PILE: CardPile = 'deck';

  /**
   * Distribute cards to multiple participants
   */
  static distributeCards(
    baseDeck: CardDefinition[], 
    participantNames: string[], 
    sessionId?: string
  ): DistributionResult {
    const errors: string[] = [];
    const participants: ParticipantDeck[] = [];
    const finalSessionId = sessionId || this.generateSessionId();

    // Validate inputs
    if (!baseDeck || baseDeck.length === 0) {
      errors.push('Base deck cannot be empty');
    }

    if (!participantNames || participantNames.length === 0) {
      errors.push('At least one participant is required');
    }

    // Check for duplicate participant names
    const uniqueNames = new Set(participantNames);
    if (uniqueNames.size !== participantNames.length) {
      errors.push('Participant names must be unique');
    }

    if (errors.length > 0) {
      return {
        success: false,
        participants: [],
        errors,
        sessionId: finalSessionId
      };
    }

    // Create shuffled deck for each participant
    for (const participantName of participantNames) {
      try {
        const participantCards = this.createParticipantCards(
          baseDeck, 
          participantName, 
          finalSessionId
        );

        participants.push({
          participantName,
          cards: participantCards,
          totalCards: participantCards.length,
          createdAt: Date.now()
        });

      } catch (error) {
        errors.push(`Failed to create deck for ${participantName}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      participants,
      errors,
      sessionId: finalSessionId
    };
  }

  /**
   * Create cards for a single participant
   */
  private static createParticipantCards(
    baseDeck: CardDefinition[], 
    participantName: string, 
    sessionId: string
  ): Card[] {
    // Generate shuffled deck for this participant
    const shuffledDeck = generateParticipantDeck(baseDeck, participantName);
    
    // Validate deck completeness
    const validation = validateDeckCompleteness(baseDeck, shuffledDeck);
    if (!validation.isValid) {
      throw new Error(`Deck validation failed: missing ${validation.missing.length}, duplicates ${validation.duplicates.length}`);
    }

    // Convert to Card instances with unique IDs
    return shuffledDeck.map((cardDef, index) => this.createCard(cardDef, participantName, sessionId, index));
  }

  /**
   * Create a Card instance from CardDefinition
   */
  private static createCard(
    cardDef: CardDefinition, 
    participantName: string, 
    sessionId: string, 
    index: number
  ): Card {
    return {
      id: this.generateCardId(sessionId, participantName, cardDef.value_name, index),
      value_name: cardDef.value_name,
      description: cardDef.description,
      position: { ...this.DEFAULT_POSITION },
      pile: this.DEFAULT_PILE,
      owner: participantName
    };
  }

  /**
   * Generate unique card ID
   */
  private static generateCardId(sessionId: string, participantName: string, valueName: string, index: number): string {
    // Format: session_participant_value_index_uniqueId
    const uniqueId = generateUniqueId('card');
    const cleanParticipant = participantName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanValue = valueName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return `${sessionId}_${cleanParticipant}_${cleanValue}_${index}_${uniqueId}`;
  }

  /**
   * Generate session ID
   */
  private static generateSessionId(): string {
    return generateUniqueId('session');
  }

  /**
   * Redistribute cards for a single participant (for rejoining sessions)
   */
  static redistributeForParticipant(
    baseDeck: CardDefinition[], 
    participantName: string, 
    sessionId: string,
    existingCards?: Card[]
  ): ParticipantDeck {
    // If existing cards provided, validate they match the base deck
    if (existingCards && existingCards.length > 0) {
      const existingDefinitions: CardDefinition[] = existingCards.map(card => ({
        value_name: card.value_name,
        description: card.description
      }));

      const validation = validateDeckCompleteness(baseDeck, existingDefinitions);
      if (validation.isValid) {
        // Return existing cards if they're still valid
        return {
          participantName,
          cards: existingCards,
          totalCards: existingCards.length,
          createdAt: Date.now()
        };
      }
    }

    // Create new deck if no valid existing cards
    const participantCards = this.createParticipantCards(baseDeck, participantName, sessionId);

    return {
      participantName,
      cards: participantCards,
      totalCards: participantCards.length,
      createdAt: Date.now()
    };
  }

  /**
   * Validate card distribution integrity
   */
  static validateDistribution(distribution: DistributionResult, baseDeck: CardDefinition[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!distribution.success) {
      errors.push('Distribution was not successful');
      return { isValid: false, errors, warnings };
    }

    // Check each participant has correct number of cards
    for (const participant of distribution.participants) {
      if (participant.cards.length !== baseDeck.length) {
        errors.push(`${participant.participantName} has ${participant.cards.length} cards, expected ${baseDeck.length}`);
      }

      // Check for duplicate card IDs within participant
      const cardIds = participant.cards.map(c => c.id);
      const uniqueCardIds = new Set(cardIds);
      if (uniqueCardIds.size !== cardIds.length) {
        errors.push(`${participant.participantName} has duplicate card IDs`);
      }

      // Check all cards belong to the participant
      const wrongOwnership = participant.cards.filter(c => c.owner !== participant.participantName);
      if (wrongOwnership.length > 0) {
        errors.push(`${participant.participantName} has ${wrongOwnership.length} cards with wrong ownership`);
      }
    }

    // Check for duplicate card IDs across all participants
    const allCardIds = distribution.participants.flatMap(p => p.cards.map(c => c.id));
    const uniqueAllCardIds = new Set(allCardIds);
    if (uniqueAllCardIds.size !== allCardIds.length) {
      errors.push('Duplicate card IDs found across participants');
    }

    // Performance warnings for large numbers
    const totalCards = allCardIds.length;
    if (totalCards > 2000) {
      warnings.push(`High card count: ${totalCards} total cards may impact performance`);
    }

    if (distribution.participants.length > 50) {
      warnings.push(`High participant count: ${distribution.participants.length} participants may impact performance`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get distribution statistics
   */
  static getDistributionStats(distribution: DistributionResult): {
    totalParticipants: number;
    totalCards: number;
    cardsPerParticipant: number;
    avgCardsPerParticipant: number;
    sessionId: string;
  } {
    const totalCards = distribution.participants.reduce((sum, p) => sum + p.cards.length, 0);
    const participantCount = distribution.participants.length;

    return {
      totalParticipants: participantCount,
      totalCards,
      cardsPerParticipant: participantCount > 0 ? distribution.participants[0].cards.length : 0,
      avgCardsPerParticipant: participantCount > 0 ? totalCards / participantCount : 0,
      sessionId: distribution.sessionId
    };
  }
}
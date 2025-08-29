import {
  Card,
  CardPile,
  Participant,
  ParticipantStep,
  ParticipantStatus,
  Session,
  DeckType,
  GameState
} from '../../lib/types';
import { PARTICIPANT_EMOJIS, PARTICIPANT_COLORS } from '../../lib/constants';

describe('types', () => {
  describe('Card interface', () => {
    it('should create valid card object', () => {
      const card: Card = {
        id: 'card-integrity',
        value_name: 'Integrity',
        description: 'Acting in accordance with moral and ethical principles',
        position: { x: 100, y: 200 },
        pile: 'deck',
        owner: 'john'
      };
      
      expect(card.id).toBe('card-integrity');
      expect(card.pile).toBe('deck');
      expect(card.position.x).toBe(100);
    });
  });

  describe('Participant interface', () => {
    it('should create valid participant object', () => {
      const participant: Participant = {
        name: 'John Doe',
        emoji: '🎯',
        color: '#FF6B6B',
        joinedAt: new Date().toISOString(),
        currentStep: 1,
        status: 'sorting',
        cardStates: {
          step1: { more: [], less: [] },
          step2: { top8: [], less: [] },
          step3: { top3: [], less: [] }
        },
        revealed: { top8: false, top3: false },
        isViewing: null,
        lastActivity: new Date().toISOString()
      };
      
      expect(participant.name).toBe('John Doe');
      expect(participant.currentStep).toBe(1);
      expect(participant.status).toBe('sorting');
    });
  });

  describe('Session interface', () => {
    it('should create valid session object', () => {
      const session: Session = {
        sessionCode: 'ABC123',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        deckType: 'dev',
        maxParticipants: 50,
        participants: [],
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      expect(session.sessionCode).toBe('ABC123');
      expect(session.deckType).toBe('dev');
      expect(session.maxParticipants).toBe(50);
      expect(session.isActive).toBe(true);
    });
  });

  describe('Type constraints', () => {
    it('should enforce CardPile type constraints', () => {
      const validPiles: CardPile[] = ['deck', 'staging', 'more', 'less', 'top8', 'top3', 'discard'];
      validPiles.forEach(pile => {
        expect(typeof pile).toBe('string');
      });
    });

    it('should enforce ParticipantStep constraints', () => {
      const validSteps: ParticipantStep[] = [1, 2, 3];
      validSteps.forEach(step => {
        expect(typeof step).toBe('number');
        expect(step).toBeGreaterThan(0);
        expect(step).toBeLessThan(4);
      });
    });

    it('should enforce ParticipantStatus constraints', () => {
      const validStatuses: ParticipantStatus[] = ['sorting', 'revealed-8', 'revealed-3', 'completed'];
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });

    it('should enforce DeckType constraints', () => {
      const validDeckTypes: DeckType[] = ['dev', 'professional', 'extended'];
      validDeckTypes.forEach(deckType => {
        expect(typeof deckType).toBe('string');
      });
    });
  });

  describe('PARTICIPANT_EMOJIS and PARTICIPANT_COLORS', () => {
    it('should have valid emoji and color arrays', () => {
      expect(Array.isArray(PARTICIPANT_EMOJIS)).toBe(true);
      expect(Array.isArray(PARTICIPANT_COLORS)).toBe(true);
      expect(PARTICIPANT_EMOJIS.length).toBeGreaterThan(0);
      expect(PARTICIPANT_COLORS.length).toBeGreaterThan(0);
      
      // Test that they contain strings
      expect(typeof PARTICIPANT_EMOJIS[0]).toBe('string');
      expect(typeof PARTICIPANT_COLORS[0]).toBe('string');
    });
  });
});

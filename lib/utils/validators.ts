import { 
  SESSION_CODE_PATTERN, 
  PARTICIPANT_NAME_MIN_LENGTH, 
  PARTICIPANT_NAME_MAX_LENGTH, 
  PILE_CAPACITIES, 
  CANVAS_BOUNDS 
} from '../constants';
import { CardPile, CardPosition, GameState } from '../types';
import { memoize, memoizeWeak, createHashKey } from './memoization';

export function isValidSessionCode(code: string): boolean {
  return SESSION_CODE_PATTERN.test(code);
}

export function isValidParticipantName(name: string): boolean {
  return name.length >= PARTICIPANT_NAME_MIN_LENGTH && 
         name.length <= PARTICIPANT_NAME_MAX_LENGTH &&
         name.trim().length > 0;
}

export function isValidPileTransition(fromPile: CardPile, toPile: CardPile): boolean {
  const validTransitions: Record<CardPile, CardPile[]> = {
    deck: ['staging'],
    staging: ['more', 'less'],
    more: ['staging', 'top8', 'less'],
    less: ['staging', 'more', 'discard'],
    top8: ['staging', 'top3', 'less'],
    top3: ['staging', 'top8', 'less'],
    discard: ['staging']
  };
  
  return validTransitions[fromPile]?.includes(toPile) || false;
}

export function canAddToPile(pile: CardPile, currentCount: number): boolean {
  const capacity = PILE_CAPACITIES[pile];
  return capacity === undefined || currentCount < capacity;
}

export function isValidPosition(position: CardPosition): boolean {
  return position.x >= CANVAS_BOUNDS.minX && 
         position.x <= CANVAS_BOUNDS.maxX &&
         position.y >= CANVAS_BOUNDS.minY && 
         position.y <= CANVAS_BOUNDS.maxY;
}

export function isDuplicateName(name: string, existingNames: string[]): boolean {
  return existingNames.some(existing => 
    existing.toLowerCase() === name.toLowerCase()
  );
}

function _validateCardMovement(cardId: string, fromPile: CardPile, toPile: CardPile, position: CardPosition, currentPileCount: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!cardId || cardId.trim().length === 0) {
    errors.push('Card ID is required');
  }
  
  if (!isValidPileTransition(fromPile, toPile)) {
    errors.push(`Invalid transition from ${fromPile} to ${toPile}`);
  }
  
  if (!canAddToPile(toPile, currentPileCount)) {
    errors.push(`Pile ${toPile} is at capacity`);
  }
  
  if (!isValidPosition(position)) {
    errors.push('Position is outside canvas bounds');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export const validateCardMovement = memoize(
  _validateCardMovement,
  (cardId, fromPile, toPile, position, currentPileCount) =>
    createHashKey(cardId, fromPile, toPile, position.x, position.y, currentPileCount)
);

function _validateGameState(state: GameState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check for duplicate card IDs across all participants
  const allCardIds = new Set<string>();
  const duplicateIds = new Set<string>();
  
  Object.values(state.participants).forEach(participant => {
    // Check Step 1 cards
    [...participant.cardStates.step1.more, ...participant.cardStates.step1.less].forEach(card => {
      if (allCardIds.has(card.id)) {
        duplicateIds.add(card.id);
      }
      allCardIds.add(card.id);
    });
    
    // Check Step 2 cards
    [...participant.cardStates.step2.top8, ...participant.cardStates.step2.less].forEach(card => {
      if (allCardIds.has(card.id)) {
        duplicateIds.add(card.id);
      }
      allCardIds.add(card.id);
    });
    
    // Check Step 3 cards
    [...participant.cardStates.step3.top3, ...participant.cardStates.step3.less].forEach(card => {
      if (allCardIds.has(card.id)) {
        duplicateIds.add(card.id);
      }
      allCardIds.add(card.id);
    });
    
    // Validate pile constraints
    if (participant.cardStates.step2.top8.length > 8) {
      errors.push(`Participant ${participant.name} has more than 8 cards in top8 pile`);
    }
    
    if (participant.cardStates.step3.top3.length > 3) {
      errors.push(`Participant ${participant.name} has more than 3 cards in top3 pile`);
    }
    
    // Validate participant data
    if (!isValidParticipantName(participant.name)) {
      errors.push(`Invalid participant name: ${participant.name}`);
    }
  });
  
  if (duplicateIds.size > 0) {
    errors.push(`Duplicate card IDs found: ${Array.from(duplicateIds).join(', ')}`);
  }
  
  // Validate session code
  if (!isValidSessionCode(state.sessionCode)) {
    errors.push(`Invalid session code: ${state.sessionCode}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export const validateGameState = memoizeWeak(_validateGameState);

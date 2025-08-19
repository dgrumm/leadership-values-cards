import { 
  SESSION_CODE_PATTERN, 
  PARTICIPANT_NAME_MIN_LENGTH, 
  PARTICIPANT_NAME_MAX_LENGTH, 
  PILE_CAPACITIES, 
  CANVAS_BOUNDS 
} from '../constants';
import { CardPile, CardPosition } from '../types';

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

export function validateCardMovement(cardId: string, fromPile: CardPile, toPile: CardPile, position: CardPosition, currentPileCount: number): {
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

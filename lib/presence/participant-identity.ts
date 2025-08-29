import type { ParticipantIdentity } from './types';
import { PARTICIPANT_EMOJIS, PARTICIPANT_COLORS } from '@/lib/constants';

/**
 * Assigns a unique color and emoji combination to a new participant
 * Uses deterministic selection based on participant count for consistency
 */
export function assignParticipantIdentity(
  existingParticipants: ParticipantIdentity[]
): ParticipantIdentity {
  const usedEmojis = new Set((existingParticipants || []).map(p => p?.emoji).filter(Boolean));
  const usedColors = new Set((existingParticipants || []).map(p => p?.color).filter(Boolean));
  
  const availableEmojis = PARTICIPANT_EMOJIS.filter(emoji => !usedEmojis.has(emoji));
  const availableColors = PARTICIPANT_COLORS.filter(color => !usedColors.has(color));
  
  if (availableEmojis.length === 0 || availableColors.length === 0) {
    throw new Error('No more unique emoji/color combinations available');
  }
  
  // Use deterministic selection based on number of existing participants
  // This provides consistency while still appearing varied
  const participantIndex = existingParticipants?.length || 0;
  
  // Create pseudo-random but deterministic indices
  const emojiIndex = (participantIndex * 7 + 13) % availableEmojis.length;
  const colorIndex = (participantIndex * 11 + 19) % availableColors.length;
  
  return {
    emoji: availableEmojis[emojiIndex],
    color: availableColors[colorIndex]
  };
}

/**
 * Validates if a participant identity has valid color and emoji
 */
export function isValidParticipantIdentity(identity: ParticipantIdentity): boolean {
  if (!identity || typeof identity !== 'object') {
    return false;
  }

  const { color, emoji } = identity;

  return (
    typeof color === 'string' &&
    typeof emoji === 'string' &&
    PARTICIPANT_COLORS.includes(color as (typeof PARTICIPANT_COLORS)[number]) &&
    PARTICIPANT_EMOJIS.includes(emoji as (typeof PARTICIPANT_EMOJIS)[number])
  );
}

/**
 * Gets the index of a color in the palette (useful for consistent ordering)
 */
export function getColorIndex(color: string): number {
  return PARTICIPANT_COLORS.indexOf(color as (typeof PARTICIPANT_COLORS)[number]);
}

/**
 * Gets the index of an emoji in the palette (useful for consistent ordering)  
 */
export function getEmojiIndex(emoji: string): number {
  return PARTICIPANT_EMOJIS.indexOf(emoji as (typeof PARTICIPANT_EMOJIS)[number]);
}

/**
 * Creates a unique string identifier from color and emoji combination
 */
export function getIdentityKey(identity: ParticipantIdentity): string {
  return `${identity.color}-${identity.emoji}`;
}

/**
 * Gets all possible identity combinations (for testing/validation)
 */
export function getAllPossibleIdentities(): ParticipantIdentity[] {
  const combinations: ParticipantIdentity[] = [];
  
  for (const color of PARTICIPANT_COLORS) {
    for (const emoji of PARTICIPANT_EMOJIS) {
      combinations.push({ color, emoji });
    }
  }
  
  return combinations;
}

/**
 * Gets the maximum number of unique participants we can support
 */
export function getMaxUniqueParticipants(): number {
  return PARTICIPANT_COLORS.length * PARTICIPANT_EMOJIS.length;
}
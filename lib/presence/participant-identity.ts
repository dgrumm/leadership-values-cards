import type { ParticipantIdentity } from './types';

// Participant color palette (15 colors from spec)
export const PARTICIPANT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Mint
  '#FECA57', // Yellow
  '#FF9FF3', // Pink
  '#54A0FF', // Light Blue
  '#5F27CD', // Purple
  '#00D2D3', // Cyan
  '#FF9F43', // Orange
  '#10AC84', // Green
  '#EE5A24', // Red Orange
  '#0984E3', // Blue
  '#6C5CE7', // Light Purple
  '#FD79A8'  // Light Pink
] as const;

// Participant emoji palette (20 emojis from spec)
export const PARTICIPANT_EMOJIS = [
  '😊', // Smiling Face
  '🎨', // Artist Palette
  '🎭', // Performing Arts
  '🎪', // Circus Tent
  '🎯', // Direct Hit
  '🎸', // Guitar
  '🎺', // Trumpet
  '🌟', // Glowing Star
  '💫', // Dizzy Symbol
  '🚀', // Rocket
  '🎲', // Game Die
  '🎈', // Balloon
  '🎊', // Confetti Ball
  '🎉', // Party Popper
  '🎁', // Wrapped Gift
  '🌈', // Rainbow
  '⭐', // White Medium Star
  '🎋', // Tanabata Tree
  '🎃', // Jack-O-Lantern
  '🎄'  // Christmas Tree
] as const;

/**
 * Assigns a unique color and emoji combination to a new participant
 * Avoids conflicts with existing participants by finding the first available combination
 */
export function assignParticipantIdentity(
  existingParticipants: ParticipantIdentity[]
): ParticipantIdentity {
  // Handle empty participants array
  if (!existingParticipants || existingParticipants.length === 0) {
    return {
      color: PARTICIPANT_COLORS[0],
      emoji: PARTICIPANT_EMOJIS[0]
    };
  }

  // Extract used colors and emojis, filtering out invalid entries
  const usedColors = existingParticipants
    .filter(p => p && typeof p.color === 'string' && p.color.length > 0)
    .map(p => p.color);
    
  const usedEmojis = existingParticipants
    .filter(p => p && typeof p.emoji === 'string' && p.emoji.length > 0)
    .map(p => p.emoji);

  // Find first available color
  const availableColor = PARTICIPANT_COLORS.find(color => 
    !usedColors.includes(color)
  );

  // Find first available emoji
  const availableEmoji = PARTICIPANT_EMOJIS.find(emoji => 
    !usedEmojis.includes(emoji)
  );

  // If we have both available color and emoji, use them
  if (availableColor && availableEmoji) {
    return {
      color: availableColor,
      emoji: availableEmoji
    };
  }

  // If we're out of unique combinations, fall back to cycling through
  // This handles the case where we have more than 15*20 = 300 participants
  // or when all combinations are used
  
  // Find the least used color
  const colorUsageCounts = PARTICIPANT_COLORS.map(color => ({
    color,
    count: usedColors.filter(used => used === color).length
  }));
  
  const leastUsedColor = colorUsageCounts
    .sort((a, b) => a.count - b.count)[0]?.color || PARTICIPANT_COLORS[0];

  // Find the least used emoji  
  const emojiUsageCounts = PARTICIPANT_EMOJIS.map(emoji => ({
    emoji,
    count: usedEmojis.filter(used => used === emoji).length
  }));
  
  const leastUsedEmoji = emojiUsageCounts
    .sort((a, b) => a.count - b.count)[0]?.emoji || PARTICIPANT_EMOJIS[0];

  return {
    color: leastUsedColor,
    emoji: leastUsedEmoji
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
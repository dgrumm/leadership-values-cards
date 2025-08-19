export const PARTICIPANT_EMOJIS = [
  '🎯', '🚀', '⭐', '🔥', '💎', '🌟', '🏆', '🎨',
  '🎪', '🎭', '🎬', '🎵', '🎸', '🎺', '🎹', '🥁',
  '🎮', '🎲', '🃏', '🎯', '🚁', '✈️', '🚢', '🏰',
  '🗿', '🎪', '🎨', '🔮', '💫', '🌙', '☀️', '⚡',
  '🔥', '💥', '✨', '🌈', '🦄', '🐉', '🦅', '🦋',
  '🌸', '🌺', '🌻', '🌹', '🍀', '🌿', '🎋', '🎍',
  '🍎', '🍊'
];

export const PARTICIPANT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F',
  '#D7BDE2', '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7',
  '#FCF3CF', '#FADBD8', '#D6EAF8', '#E8DAEF', '#D1F2EB',
  '#FEF9E7', '#FDEDEC', '#EBF5FB', '#F4ECF7', '#E8F8F5',
  '#FFF2CC', '#FFEBEE', '#E3F2FD', '#F3E5F5', '#E0F2F1',
  '#FFFDE7', '#FFF3E0', '#E8EAF6', '#FCE4EC', '#E1F5FE',
  '#F1F8E9', '#FFF8E1', '#EFEBE9', '#FAFAFA', '#ECEFF1',
  '#E8F5E8', '#FFF9C4', '#FFECB3', '#DCEDC8', '#C8E6C9'
];

export function getUniqueEmojiAndColor(existingParticipants: Array<{emoji: string, color: string}>): {emoji: string, color: string} {
  const usedEmojis = new Set(existingParticipants.map(p => p.emoji));
  const usedColors = new Set(existingParticipants.map(p => p.color));
  
  const availableEmojis = PARTICIPANT_EMOJIS.filter(emoji => !usedEmojis.has(emoji));
  const availableColors = PARTICIPANT_COLORS.filter(color => !usedColors.has(color));
  
  if (availableEmojis.length === 0 || availableColors.length === 0) {
    throw new Error('No more unique emoji/color combinations available');
  }
  
  return {
    emoji: availableEmojis[Math.floor(Math.random() * availableEmojis.length)],
    color: availableColors[Math.floor(Math.random() * availableColors.length)]
  };
}

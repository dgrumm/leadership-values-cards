import { SessionConfig } from '../types';

export const SESSION_CONFIG: SessionConfig = {
  maxParticipants: 50,
  timeoutMinutes: 60,
  warningMinutes: 55,
  deckType: 'dev'
};

export const SESSION_CODE_LENGTH = 6;
export const SESSION_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export const PARTICIPANT_NAME_MIN_LENGTH = 1;
export const PARTICIPANT_NAME_MAX_LENGTH = 50;

export const CANVAS_BOUNDS = {
  width: 4000,
  height: 3000,
  minX: -2000,
  maxX: 2000,
  minY: -1500,
  maxY: 1500
};

export const PILE_CAPACITIES = {
  deck: 40,
  staging: 1,
  more: 40,
  less: 40,
  top8: 8,
  top3: 3,
  discard: 40
} as const;

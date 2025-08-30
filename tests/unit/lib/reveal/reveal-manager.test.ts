import { createRevealManager, RevealManager } from '@/lib/reveal/reveal-manager';
import { getSessionStoreManager } from '@/lib/stores';

// Mock dependencies
jest.mock('@/lib/session/session-manager', () => ({
  getSessionManager: jest.fn(() => ({
    getSession: jest.fn(),
    updateSession: jest.fn()
  }))
}));

jest.mock('@/lib/session/session-store', () => ({
  getSessionStore: jest.fn(() => ({
    updateSession: jest.fn()
  }))
}));

jest.mock('@/lib/stores/session-store-manager', () => ({
  getSessionStoreManager: jest.fn(() => ({
    getStep2Store: jest.fn(() => ({
      getState: () => ({ top8Pile: [] })
    })),
    getStep3Store: jest.fn(() => ({
      getState: () => ({ top3Pile: [] })
    }))
  }))
}));

describe('RevealManager', () => {
  const mockSessionCode = 'TEST01';
  const mockParticipantId = 'participant_test123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRevealManager', () => {
    it('should create a RevealManager instance', () => {
      const manager = createRevealManager(mockSessionCode, mockParticipantId);
      expect(manager).toBeInstanceOf(RevealManager);
    });

    it('should initialize with sessionStoreManager', () => {
      const manager = createRevealManager(mockSessionCode, mockParticipantId);
      expect(getSessionStoreManager).toHaveBeenCalled();
    });
  });

  describe('RevealManager constructor', () => {
    it('should not throw when creating instance', () => {
      expect(() => {
        new RevealManager(mockSessionCode, mockParticipantId);
      }).not.toThrow();
    });
  });
});

describe('getSessionStoreManager import', () => {
  it('should be a function', () => {
    expect(typeof getSessionStoreManager).toBe('function');
  });

  it('should return a manager instance', () => {
    const manager = getSessionStoreManager();
    expect(manager).toBeDefined();
  });
});
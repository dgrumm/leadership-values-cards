import { renderHook, act } from '@testing-library/react';
import { useSessionJoin } from '@/hooks/useSessionJoin';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('useSessionJoin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('joinOrCreateSession', () => {
    it('joins existing session successfully', async () => {
      const mockJoinResponse = {
        session: { sessionCode: 'ABC123' },
        participant: { name: 'John' }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJoinResponse)
      });

      const { result } = renderHook(() => useSessionJoin());
      const onSuccess = jest.fn();

      await act(async () => {
        const response = await result.current.joinOrCreateSession({
          name: 'John',
          sessionCode: 'ABC123',
          onSuccess
        });

        expect(response.success).toBe(true);
        expect(response.action).toBe('joined-or-created');
      });

      expect(fetch).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'John', sessionCode: 'ABC123' }),
        signal: expect.any(AbortSignal)
      });

      expect(onSuccess).toHaveBeenCalledWith('ABC123', 'John');
      expect(mockPush).toHaveBeenCalledWith('/canvas?session=ABC123&name=John');
    });

    it('creates new session when session not found (atomic operation)', async () => {
      const mockCreateResponse = {
        session: { sessionCode: 'ABC123' },
        participant: { name: 'John' }
      };

      // Mock atomic join-or-create API
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreateResponse)
      });

      const { result } = renderHook(() => useSessionJoin());
      const onSuccess = jest.fn();

      await act(async () => {
        const response = await result.current.joinOrCreateSession({
          name: 'John',
          sessionCode: 'ABC123',
          onSuccess
        });

        expect(response.success).toBe(true);
        expect(response.action).toBe('joined-or-created');
      });

      // Should use atomic API
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'John', sessionCode: 'ABC123' }),
        signal: expect.any(AbortSignal)
      });

      expect(onSuccess).toHaveBeenCalledWith('ABC123', 'John');
      expect(mockPush).toHaveBeenCalledWith('/canvas?session=ABC123&name=John');
    });

    it('handles session full error', async () => {
      const mockErrorResponse = {
        error: 'Session is full (50 participants max)'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockErrorResponse)
      });

      const { result } = renderHook(() => useSessionJoin());
      const onError = jest.fn();

      await act(async () => {
        const response = await result.current.joinOrCreateSession({
          name: 'John',
          sessionCode: 'ABC123',
          onError
        });

        expect(response.success).toBe(false);
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith('Session is full (50 participants max)');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSessionJoin());
      const onError = jest.fn();

      await act(async () => {
        const response = await result.current.joinOrCreateSession({
          name: 'John',
          sessionCode: 'ABC123',
          onError
        });

        expect(response.success).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith('Network error');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('updates loading state correctly', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ 
            session: { sessionCode: 'ABC123' },
            participant: { name: 'John' } 
          })
        }), 100))
      );

      const { result } = renderHook(() => useSessionJoin());

      // Initially not loading
      expect(result.current.isLoading).toBe(false);

      // Start join process
      const joinPromise = act(async () => {
        return result.current.joinOrCreateSession({
          name: 'John',
          sessionCode: 'ABC123'
        });
      });

      // Should be loading during request
      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await joinPromise;

      // Should not be loading after completion
      expect(result.current.isLoading).toBe(false);
    });

    it('handles timeout errors', async () => {
      // Mock AbortError for timeout
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('Timeout'), { name: 'AbortError' })
      );

      const { result } = renderHook(() => useSessionJoin());
      const onError = jest.fn();

      await act(async () => {
        const response = await result.current.joinOrCreateSession({
          name: 'John',
          sessionCode: 'ABC123',
          onError
        });

        expect(response.success).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith('Request timeout. Please check your connection and try again.');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useSessionJoin());

      // Trigger an error
      await act(async () => {
        await result.current.joinOrCreateSession({
          name: 'John',
          sessionCode: 'ABC123'
        });
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
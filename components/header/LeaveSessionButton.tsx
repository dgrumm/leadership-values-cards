'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';

export function LeaveSessionButton() {
  const router = useRouter();
  const { leaveSession } = useEventDrivenSession();

  const handleLeaveSession = async () => {
    try {
      // Clean up session properly
      console.log('🚪 [LeaveSessionButton] Starting session cleanup...');
      await leaveSession();
      
      // Clear any session data and return to login
      if (typeof window !== 'undefined') {
        // Clear session storage
        sessionStorage.removeItem('leadership-values-login');
        console.log('✅ [LeaveSessionButton] Cleared session storage');
      }
      
      // Navigate to login screen
      console.log('🔄 [LeaveSessionButton] Navigating to login...');
      router.push('/');
      
    } catch (error) {
      console.error('❌ [LeaveSessionButton] Error during session cleanup:', error);
      // Still navigate even if cleanup fails
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('leadership-values-login');
      }
      router.push('/');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLeaveSession}
      className="text-gray-600 hover:text-gray-800"
    >
      ← Leave Session
    </Button>
  );
}
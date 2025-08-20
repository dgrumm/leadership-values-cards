'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function LeaveSessionButton() {
  const router = useRouter();

  const handleLeaveSession = () => {
    // Clear any session data and return to login
    if (typeof window !== 'undefined') {
      // Clear session storage
      sessionStorage.removeItem('leadership-values-login');
      
      // Navigate to login screen
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
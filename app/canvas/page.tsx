'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/WelcomeScreen';

export default function CanvasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<{
    sessionCode: string;
    participantName: string;
  } | null>(null);

  useEffect(() => {
    const sessionCode = searchParams.get('session');
    const participantName = searchParams.get('name');

    if (!sessionCode || !participantName) {
      // Redirect to login if missing session data
      router.replace('/');
      return;
    }

    setSessionData({
      sessionCode,
      participantName: decodeURIComponent(participantName)
    });
    setIsLoading(false);
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 w-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return null; // Will redirect to login
  }

  return (
    <WelcomeScreen
      participantName={sessionData.participantName}
      sessionCode={sessionData.sessionCode}
    />
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useAblyConnectionStatus } from '@/hooks/collaboration/useAbly';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  showLastConnected?: boolean;
}

export function ConnectionStatus({ 
  className, 
  showDetails = false, 
  showLastConnected = false 
}: ConnectionStatusProps) {
  const {
    connectionState,
    isOnline,
    isConnecting,
    hasError,
    lastConnectedAt,
    reconnectAttempts,
    statusMessage
  } = useAblyConnectionStatus();

  // Status indicator styling
  const getStatusColor = () => {
    if (isOnline) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500 animate-pulse';
    if (hasError) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getStatusTextColor = () => {
    if (isOnline) return 'text-green-600';
    if (isConnecting) return 'text-yellow-600';
    if (hasError) return 'text-red-600';
    return 'text-gray-600';
  };

  // Format last connected time
  const formatLastConnected = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (!showDetails) {
    // Minimal status indicator
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
        <span className={cn("text-sm font-medium", getStatusTextColor())}>
          {isOnline ? 'Live' : isConnecting ? 'Connecting...' : 'Offline'}
        </span>
      </div>
    );
  }

  // Detailed status display
  return (
    <div className={cn("flex flex-col gap-2 p-3 rounded-lg border bg-card", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("w-3 h-3 rounded-full", getStatusColor())} />
        <div className="flex-1">
          <div className={cn("text-sm font-medium", getStatusTextColor())}>
            {statusMessage}
          </div>
          {showLastConnected && lastConnectedAt && (
            <div className="text-xs text-muted-foreground">
              Last connected: {formatLastConnected(lastConnectedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Additional details for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <div>State: <span className="font-mono">{connectionState}</span></div>
          {reconnectAttempts > 0 && (
            <div>Reconnect attempts: {reconnectAttempts}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Floating connection indicator (for showing in corner of app)
export function FloatingConnectionStatus({ className }: { className?: string }) {
  const { isOnline } = useAblyConnectionStatus();
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide when connected after a delay
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isOnline]);

  // Always show when there are issues
  const shouldShow = isVisible || !isOnline;

  if (!shouldShow) return null;

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 transition-all duration-300",
      shouldShow ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      className
    )}>
      <ConnectionStatus showDetails className="shadow-lg" />
    </div>
  );
}

// Connection error banner
export function ConnectionErrorBanner() {
  const { hasError, statusMessage, isConnecting } = useAblyConnectionStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal when connection recovers
  useEffect(() => {
    if (!hasError) {
      setIsDismissed(false);
    }
  }, [hasError]);

  if (!hasError || isDismissed) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 mb-1">
            Connection Issue
          </h4>
          <p className="text-sm text-red-700 mb-3">
            {statusMessage}
          </p>
          {isConnecting ? (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <div className="w-4 h-4 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />
              Attempting to reconnect...
            </div>
          ) : (
            <p className="text-sm text-red-600">
              Your card sorting will continue to work offline, but you won&apos;t see updates from other participants until the connection is restored.
            </p>
          )}
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-red-400 hover:text-red-600 text-lg leading-none"
          aria-label="Dismiss connection error"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Simple connection status for header/navigation
export function HeaderConnectionStatus() {
  const { isOnline, isConnecting } = useAblyConnectionStatus();
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-500" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-gray-400"
      )} />
      <span className="hidden sm:inline">
        {isOnline ? 'Live' : isConnecting ? 'Connecting...' : 'Offline'}
      </span>
    </div>
  );
}
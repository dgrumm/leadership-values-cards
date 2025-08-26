'use client';

import React from 'react';
import { classifyAblyError, AblyErrorType } from '@/lib/ably/config';

interface AblyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface AblyErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class AblyErrorBoundary extends React.Component<AblyErrorBoundaryProps, AblyErrorBoundaryState> {
  constructor(props: AblyErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): AblyErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log error details
    console.error('AblyErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default error display
      return (
        <DefaultAblyErrorFallback 
          error={this.state.error} 
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
interface DefaultAblyErrorFallbackProps {
  error: Error;
  retry: () => void;
}

function DefaultAblyErrorFallback({ error, retry }: DefaultAblyErrorFallbackProps) {
  const classifiedError = classifyAblyError(error);
  
  const getErrorTitle = () => {
    switch (classifiedError.type) {
      case AblyErrorType.INITIALIZATION:
        return 'Failed to Initialize Real-time Features';
      case AblyErrorType.CONNECTION:
        return 'Connection Problem';
      case AblyErrorType.AUTHENTICATION:
        return 'Authentication Error';
      case AblyErrorType.NETWORK:
        return 'Network Connection Issue';
      case AblyErrorType.RATE_LIMIT:
        return 'Rate Limit Exceeded';
      case AblyErrorType.CHANNEL:
        return 'Channel Error';
      default:
        return 'Real-time Features Unavailable';
    }
  };

  const getErrorDescription = () => {
    switch (classifiedError.type) {
      case AblyErrorType.INITIALIZATION:
        return 'The real-time collaboration features could not be started. You can still use the card sorting exercise, but you won\'t see updates from other participants.';
      case AblyErrorType.CONNECTION:
        return 'Having trouble connecting to the real-time service. Your card sorting will work offline, but collaboration features may be limited.';
      case AblyErrorType.AUTHENTICATION:
        return 'There was a problem with the authentication configuration. Real-time features are temporarily unavailable.';
      case AblyErrorType.NETWORK:
        return 'Your network connection seems to be having issues. You can continue sorting cards, but real-time collaboration is paused.';
      case AblyErrorType.RATE_LIMIT:
        return 'Too many requests were made to the real-time service. Please wait a moment before trying again.';
      case AblyErrorType.CHANNEL:
        return 'There was a problem with the communication channel. Real-time features may be limited.';
      default:
        return 'The real-time collaboration features encountered an unexpected error. Your card sorting will still work, but you might not see updates from other participants.';
    }
  };

  const getActionSuggestion = () => {
    switch (classifiedError.type) {
      case AblyErrorType.NETWORK:
        return 'Check your internet connection and try again.';
      case AblyErrorType.RATE_LIMIT:
        return 'Please wait a minute before retrying.';
      case AblyErrorType.AUTHENTICATION:
        return 'This might be a configuration issue. Try refreshing the page.';
      default:
        return classifiedError.recoverable ? 'You can try again, or continue with offline card sorting.' : 'Try refreshing the page, or continue with offline card sorting.';
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 my-4">
      <div className="flex items-start gap-4">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-1">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-800 mb-2">
            {getErrorTitle()}
          </h3>
          
          <p className="text-amber-700 mb-3">
            {getErrorDescription()}
          </p>
          
          <p className="text-amber-600 text-sm mb-4">
            {getActionSuggestion()}
          </p>
          
          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4">
              <summary className="text-sm text-amber-600 cursor-pointer mb-2">
                Error Details (Development)
              </summary>
              <div className="bg-amber-100 rounded p-3 text-xs font-mono text-amber-800 overflow-auto max-h-32">
                <div><strong>Type:</strong> {classifiedError.type}</div>
                <div><strong>Code:</strong> {classifiedError.code || 'N/A'}</div>
                <div><strong>Message:</strong> {classifiedError.message}</div>
                <div><strong>Recoverable:</strong> {classifiedError.recoverable ? 'Yes' : 'No'}</div>
                {classifiedError.retryAfter && (
                  <div><strong>Retry After:</strong> {classifiedError.retryAfter}ms</div>
                )}
              </div>
            </details>
          )}
          
          <div className="flex gap-3">
            {classifiedError.recoverable && (
              <button
                onClick={retry}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Specialized hook for handling Ably errors gracefully
export function useAblyErrorHandler() {
  const [lastError, setLastError] = React.useState<Error | null>(null);

  const handleAblyError = React.useCallback((error: Error) => {
    const classifiedError = classifyAblyError(error);
    console.warn('Ably error handled:', classifiedError);
    
    setLastError(error);

    // Auto-clear error after a delay if it's recoverable
    if (classifiedError.recoverable && classifiedError.retryAfter) {
      setTimeout(() => {
        setLastError(null);
      }, classifiedError.retryAfter);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    handleAblyError,
    clearError
  };
}
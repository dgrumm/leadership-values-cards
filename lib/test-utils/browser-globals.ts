/**
 * Browser-side test utilities exposed as global functions
 * This script should be injected into E2E test pages
 */

import { StateInjectionUtils } from './state-injection';

declare global {
  interface Window {
    StateInjectionUtils: typeof StateInjectionUtils;
    // Zustand store access
    useStep1Store?: any;
    useStep2Store?: any; 
    useStep3Store?: any;
  }
}

// Expose utilities globally for E2E tests
if (typeof window !== 'undefined') {
  window.StateInjectionUtils = StateInjectionUtils;
}

export { StateInjectionUtils };
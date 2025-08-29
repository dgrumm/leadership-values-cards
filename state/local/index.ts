/**
 * Store Factories - Public API for creating isolated store instances
 * Replaced global singletons to fix participant state bleeding
 */

// Export factory functions
export { createStep1Store, type Step1Store } from './step1-store-factory';
export { createStep2Store, type Step2Store } from './step2-store-factory';
export { createStep3Store, type Step3Store } from './step3-store-factory';

// Export shared types
export type {
  Step1State,
  Step2State, 
  Step3State,
  StoreFactory,
  Step1StoreInstance,
  Step2StoreInstance,
  Step3StoreInstance,
  StoreBundle
} from './store-types';

// DEPRECATED: Legacy global store exports (backward compatibility)
// These will be removed in Phase 04.5.4 after component migration
/** @deprecated Use createStep1Store() with SessionStoreManager instead */
export { useStep1Store } from './step1-store';
/** @deprecated Use createStep2Store() with SessionStoreManager instead */
export { useStep2Store } from './step2-store';
/** @deprecated Use createStep3Store() with SessionStoreManager instead */
export { useStep3Store } from './step3-store';
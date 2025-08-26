/**
 * Animation timing constants for the Leadership Values Card Sort application
 * All timings in milliseconds, optimized for 60fps performance
 */

export const ANIMATION_TIMINGS = {
  // Card interactions
  cardFlip: 250,           // 200-300ms range for card front/back flip
  cardSnap: 200,           // Snap to pile animation
  cardHover: 150,          // Hover state change
  cardBounce: 400,         // Rejection bounce when pile is full
  
  // Pile transitions  
  pileTransition: 500,     // Step transitions between sorting phases
  frameExpansion: 500,     // Review frame growth animation
  deckShuffle: 1500,       // Post-login initial deck shuffle
  
  // UI feedback
  fadeIn: 200,             // Modal/button appearances
  fadeOut: 200,            // Dismissals
  buttonPress: 100,        // Button press feedback
  notification: 300,       // Toast messages
  
  // Stagger patterns
  cardStagger: 100,        // Delay between card animations
  buttonStagger: 50,       // Button group animations
  
  // Microinteractions
  buttonHover: 100,        // Button hover state
  tooltipAppear: 200,      // Tooltip fade-in
  counterBounce: 300,      // Number counter updates
  progressBar: 400,        // Progress bar width changes
  
  // Error states
  shake: 400,              // Input field error shake
  pulse: 600,              // Attention-requiring elements
  slideIn: 300,            // Warning slide-in notifications
  
  // Loading states
  skeletonPulse: 1200,     // Skeleton screen animation
  spinnerRotation: 800,    // Loading spinner
  dealingDelay: 50,        // Card dealing intervals
} as const;

/**
 * Animation easing presets using cubic-bezier curves
 */
export const EASING = {
  // Standard Material Design easing
  standard: [0.4, 0.0, 0.2, 1],
  decelerate: [0.0, 0.0, 0.2, 1],
  accelerate: [0.4, 0.0, 1, 1],
  
  // Custom easing for card interactions
  cardFlip: [0.25, 0.46, 0.45, 0.94],
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.175, 0.885, 0.32, 1.275],
  
  // Pile transitions
  pileMove: [0.25, 0.1, 0.25, 1],
  frameExpand: [0.23, 1, 0.32, 1],
} as const;

/**
 * Performance thresholds and optimization settings
 */
export const PERFORMANCE = {
  targetFPS: 60,
  frameTime: 16.67,        // 1000ms / 60fps
  maxAnimationDuration: 2000, // Safety limit for long animations
  reducedMotionFallback: 100, // Fallback duration when motion is reduced
  batchSize: 10,           // Max simultaneous animations
} as const;

/**
 * Debug mode configuration
 */
export const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV === 'development',
  slowMotionMultiplier: 4,  // 0.25x speed for debugging
  showBoundaries: false,    // Visual animation boundaries
  logPerformance: true,     // Performance monitoring
  visualizeStagger: false,  // Show stagger timing
} as const;

/**
 * Accessibility configuration
 */
export const A11Y_CONFIG = {
  respectReducedMotion: true,
  focusTimeout: 100,       // Delay before focus management
  announceDelay: 200,      // Screen reader announcement delay
  skipAnimationsThreshold: 0, // Skip animations shorter than this
} as const;
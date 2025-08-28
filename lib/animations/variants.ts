/**
 * Framer Motion animation variants for the Leadership Values Card Sort application
 * Organized by component type and interaction patterns
 */

import { Variants } from 'framer-motion';
import { ANIMATION_TIMINGS, EASING } from './constants';

/**
 * Card flip animation variants for front/back reveals
 */
export const cardFlipVariants: Variants = {
  front: {
    rotateY: 0,
    scale: 1,
    transition: {
      duration: ANIMATION_TIMINGS.cardFlip / 1000,
      ease: EASING.cardFlip,
    }
  },
  back: {
    rotateY: 180,
    scale: 1,
    transition: {
      duration: ANIMATION_TIMINGS.cardFlip / 1000,
      ease: EASING.cardFlip,
    }
  },
  staging: {
    rotateY: 0,
    scale: 1.02,
    y: -4,
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    transition: {
      duration: ANIMATION_TIMINGS.cardFlip / 1000,
      ease: EASING.cardFlip,
    }
  }
};

/**
 * Card hover and interaction states
 */
export const cardHoverVariants: Variants = {
  idle: {
    y: 0,
    scale: 1,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: {
      duration: ANIMATION_TIMINGS.cardHover / 1000,
      ease: EASING.standard,
    }
  },
  hover: {
    y: -4,
    scale: 1.02,
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    transition: {
      duration: ANIMATION_TIMINGS.cardHover / 1000,
      ease: EASING.standard,
    }
  },
  dragging: {
    scale: 1.05,
    rotate: 2,
    boxShadow: '0 12px 35px rgba(0,0,0,0.2)',
    zIndex: 1000,
    transition: {
      duration: ANIMATION_TIMINGS.cardHover / 1000,
      ease: EASING.standard,
    }
  },
  selected: {
    scale: 1.02,
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5), 0 8px 25px rgba(0,0,0,0.15)',
    transition: {
      duration: ANIMATION_TIMINGS.cardHover / 1000,
      ease: EASING.standard,
    }
  }
};

/**
 * Pile transition animations for step changes
 */
export const pileTransitionVariants: Variants = {
  initial: {
    scale: 1,
    x: 0,
    y: 0,
    rotate: 0,
  },
  collecting: {
    scale: 0.9,
    y: -20,
    transition: {
      duration: ANIMATION_TIMINGS.pileTransition * 0.3 / 1000,
      ease: EASING.pileMove,
    }
  },
  stacking: {
    scale: 0.8,
    y: 0,
    transition: {
      duration: ANIMATION_TIMINGS.pileTransition * 0.3 / 1000,
      ease: EASING.pileMove,
    }
  },
  flipping: {
    rotateY: 180,
    transition: {
      duration: ANIMATION_TIMINGS.cardFlip / 1000,
      ease: EASING.cardFlip,
    }
  },
  moving: {
    x: [0, -100, -300],
    y: [0, 50, 120],
    scale: [0.8, 0.7, 0.6],
    transition: {
      duration: ANIMATION_TIMINGS.pileTransition / 1000,
      ease: EASING.pileMove,
      times: [0, 0.4, 1],
    }
  },
  redistributing: {
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: ANIMATION_TIMINGS.pileTransition * 0.6 / 1000,
      ease: EASING.pileMove,
    }
  }
};

/**
 * Frame expansion animation for review state
 */
export const frameExpansionVariants: Variants = {
  collapsed: {
    width: '300px',
    height: '400px',
    scale: 1,
    transition: {
      duration: ANIMATION_TIMINGS.frameExpansion / 1000,
      ease: EASING.frameExpand,
    }
  },
  expanded: {
    width: '80%',
    height: '70%',
    scale: 1,
    transition: {
      duration: ANIMATION_TIMINGS.frameExpansion / 1000,
      ease: EASING.frameExpand,
      delayChildren: 0.2,
      staggerChildren: ANIMATION_TIMINGS.cardStagger / 1000,
    }
  }
};

/**
 * Card snap-to-pile animation with subtle overshoot
 */
export const cardSnapVariants: Variants = {
  snapping: {
    scale: [1, 1.05, 1],
    transition: {
      duration: ANIMATION_TIMINGS.cardSnap / 1000,
      ease: EASING.elastic,
      times: [0, 0.6, 1],
    }
  }
};

/**
 * Bounce rejection animation for pile overflow
 */
export const bounceRejectionVariants: Variants = {
  rejected: {
    x: [0, -20, 15, -10, 5, 0],
    scale: [1, 0.95, 1.02, 0.98, 1.01, 1],
    transition: {
      duration: ANIMATION_TIMINGS.cardBounce / 1000,
      ease: EASING.bounce,
      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
    }
  }
};

/**
 * Staggered card distribution patterns
 */
export const staggeredDistribution: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: ANIMATION_TIMINGS.fadeIn / 1000,
      ease: EASING.standard,
      staggerChildren: ANIMATION_TIMINGS.cardStagger / 1000,
      delayChildren: 0.1,
    }
  }
};

/**
 * Button and UI element animations
 */
export const buttonVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: {
      duration: ANIMATION_TIMINGS.buttonHover / 1000,
      ease: EASING.standard,
    }
  },
  pressed: {
    scale: 0.98,
    transition: {
      duration: ANIMATION_TIMINGS.buttonPress / 1000,
      ease: EASING.accelerate,
    }
  },
  disabled: {
    scale: 1,
    opacity: 0.6,
    boxShadow: 'none',
  }
};

/**
 * Modal and overlay animations
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: ANIMATION_TIMINGS.fadeIn / 1000,
      ease: EASING.standard,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: ANIMATION_TIMINGS.fadeOut / 1000,
      ease: EASING.accelerate,
    }
  }
};

/**
 * Error state animations
 */
export const errorVariants: Variants = {
  shake: {
    x: [0, -8, 6, -4, 2, 0],
    transition: {
      duration: ANIMATION_TIMINGS.shake / 1000,
      ease: EASING.elastic,
    }
  },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: ANIMATION_TIMINGS.pulse / 1000,
      ease: EASING.standard,
      repeat: Infinity,
      repeatType: 'reverse',
    }
  }
};

/**
 * Loading and skeleton animations
 */
export const loadingVariants: Variants = {
  pulse: {
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: ANIMATION_TIMINGS.skeletonPulse / 1000,
      ease: EASING.standard,
      repeat: Infinity,
      repeatType: 'reverse',
    }
  },
  spin: {
    rotate: 360,
    transition: {
      duration: ANIMATION_TIMINGS.spinnerRotation / 1000,
      ease: 'linear',
      repeat: Infinity,
    }
  }
};

/**
 * Tooltip and notification animations
 */
export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: ANIMATION_TIMINGS.tooltipAppear / 1000,
      ease: EASING.standard,
    }
  }
};

/**
 * Progress bar animations
 */
export const progressVariants: Variants = {
  updating: {
    transition: {
      duration: ANIMATION_TIMINGS.progressBar / 1000,
      ease: EASING.standard,
    }
  }
};
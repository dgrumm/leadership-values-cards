# Leadership Values Card Sort - Style Guide

## Color Palette

### Primary Colors
```css
/* Brand Blue - Primary actions, links, focus states */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;   /* Main brand blue */
--primary-600: #2563eb;   /* Hover states */
--primary-700: #1d4ed8;   /* Active states */
--primary-900: #1e3a8a;   /* High contrast text */

/* Secondary Purple - Accents, gradients */
--secondary-400: #a78bfa;
--secondary-500: #8b5cf6;
--secondary-600: #7c3aed;
```

### Semantic Colors
```css
/* Success - Confirmations, valid states */
--success-50: #f0fdf4;
--success-100: #dcfce7;
--success-500: #22c55e;   /* Success actions */
--success-600: #16a34a;   /* Success hover */
--success-700: #15803d;   /* Success active */

/* Warning - Cautions, constraints */
--warning-50: #fffbeb;
--warning-100: #fef3c7;
--warning-500: #f59e0b;   /* Warning states */
--warning-600: #d97706;   /* Warning hover */

/* Error - Errors, invalid states */
--error-50: #fef2f2;
--error-100: #fecaca;
--error-500: #ef4444;     /* Error states */
--error-600: #dc2626;     /* Error hover */
--error-700: #b91c1c;     /* Error active */
```

### Neutral Colors
```css
/* Grayscale - Text, borders, backgrounds */
--gray-50: #f9fafb;       /* Light backgrounds */
--gray-100: #f3f4f6;      /* Subtle backgrounds */
--gray-200: #e5e7eb;      /* Borders, dividers */
--gray-300: #d1d5db;      /* Input borders */
--gray-400: #9ca3af;      /* Placeholders */
--gray-500: #6b7280;      /* Secondary text */
--gray-600: #4b5563;      /* Body text */
--gray-700: #374151;      /* Headings */
--gray-800: #1f2937;      /* High emphasis text */
--gray-900: #111827;      /* Maximum contrast */

/* Pure values for maximum contrast */
--white: #ffffff;
--black: #000000;
```

### Color Usage Guidelines

#### Text Color Hierarchy
- **Primary text**: `gray-800` on light backgrounds, `gray-100` on dark
- **Secondary text**: `gray-600` on light backgrounds, `gray-400` on dark  
- **Disabled text**: `gray-400` on light backgrounds, `gray-600` on dark
- **Link text**: `primary-600` with `primary-700` hover

#### Background Colors
- **Primary background**: `white` or `gray-50` for main content areas
- **Secondary background**: `gray-100` for subtle differentiation
- **Elevated surfaces**: `white` with shadow for cards and modals
- **Interactive backgrounds**: Color-specific 50-tint for hover states

#### Border Colors
- **Default borders**: `gray-200` for subtle separation
- **Input borders**: `gray-300` for form elements
- **Focus borders**: `primary-500` with 2px width
- **Error borders**: `error-500` for validation feedback

## Typography System

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Helvetica Neue', sans-serif;
```

### Type Scale
```css
/* Display - Large headings, hero text */
--text-display-lg: 4.5rem;    /* 72px */
--text-display-md: 3.75rem;   /* 60px */
--text-display-sm: 3rem;      /* 48px */

/* Headings */
--text-h1: 2.25rem;           /* 36px */
--text-h2: 1.875rem;          /* 30px */
--text-h3: 1.5rem;            /* 24px */
--text-h4: 1.25rem;           /* 20px */
--text-h5: 1.125rem;          /* 18px */
--text-h6: 1rem;              /* 16px */

/* Body text */
--text-lg: 1.125rem;          /* 18px */
--text-base: 1rem;            /* 16px - Base size */
--text-sm: 0.875rem;          /* 14px */
--text-xs: 0.75rem;           /* 12px */
```

### Line Height
```css
--leading-tight: 1.25;        /* Headings */
--leading-normal: 1.5;        /* Body text */
--leading-relaxed: 1.625;     /* Long form content */
```

### Font Weights
```css
--font-light: 300;            /* Subtle text */
--font-normal: 400;           /* Body text */
--font-medium: 500;           /* Emphasized text */
--font-semibold: 600;         /* Subheadings */
--font-bold: 700;             /* Headings */
```

### Typography Usage
- **Page titles**: `text-h1` with `font-bold` and `leading-tight`
- **Section headings**: `text-h2` or `text-h3` with `font-semibold`
- **Card titles**: `text-lg` with `font-bold`
- **Body text**: `text-base` with `font-normal` and `leading-normal`
- **Captions**: `text-sm` with `font-medium` and `gray-600` color

## Spacing System

### Base Unit
All spacing uses a **4px base unit** for consistent rhythm and alignment.

### Spacing Scale
```css
--space-0: 0px;               /* No spacing */
--space-1: 0.25rem;           /* 4px */
--space-2: 0.5rem;            /* 8px */
--space-3: 0.75rem;           /* 12px */
--space-4: 1rem;              /* 16px */
--space-5: 1.25rem;           /* 20px */
--space-6: 1.5rem;            /* 24px */
--space-8: 2rem;              /* 32px */
--space-10: 2.5rem;           /* 40px */
--space-12: 3rem;             /* 48px */
--space-16: 4rem;             /* 64px */
--space-20: 5rem;             /* 80px */
--space-24: 6rem;             /* 96px */
```

### Component Spacing
- **Button padding**: `space-3` vertical, `space-4` horizontal
- **Card padding**: `space-6` for content areas
- **Input padding**: `space-3` vertical, `space-4` horizontal
- **Section margins**: `space-8` or `space-12` between major sections

## Border Radius

### Border Radius Scale
```css
--radius-none: 0px;           /* Sharp corners */
--radius-sm: 0.125rem;        /* 2px - Small elements */
--radius-base: 0.25rem;       /* 4px - Default */
--radius-md: 0.375rem;        /* 6px - Buttons, inputs */
--radius-lg: 0.5rem;          /* 8px - Cards */
--radius-xl: 0.75rem;         /* 12px - Large cards */
--radius-2xl: 1rem;           /* 16px - Modals */
--radius-full: 9999px;        /* Pills, badges */
```

### Usage Guidelines
- **Buttons**: `radius-md` (6px)
- **Input fields**: `radius-md` (6px)  
- **Cards**: `radius-lg` (8px) or `radius-xl` (12px)
- **Modals**: `radius-2xl` (16px)
- **Game cards**: `radius-xl` (12px) for premium feel

## Shadows and Elevation

### Shadow Scale
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 
               0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
             0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
             0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
             0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### Elevation Usage
- **Level 1**: `shadow-sm` - Subtle separation (table rows)
- **Level 2**: `shadow-base` - Default cards and buttons
- **Level 3**: `shadow-md` - Raised cards and dropdowns
- **Level 4**: `shadow-lg` - Modals and overlays
- **Level 5**: `shadow-xl` - Maximum elevation (tooltips)

## Animation and Transitions

### Duration Scale
```css
--duration-75: 75ms;          /* Micro-interactions */
--duration-100: 100ms;        /* Button states */
--duration-150: 150ms;        /* Input focus */
--duration-200: 200ms;        /* Card hovers */
--duration-300: 300ms;        /* Page transitions */
--duration-500: 500ms;        /* Complex animations */
--duration-700: 700ms;        /* Step transitions */
```

### Easing Functions
```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-back: cubic-bezier(0.68, -0.55, 0.265, 1.55);  /* Bounce effect */
```

### Animation Guidelines
- **Hover states**: `duration-150` with `ease-out`
- **Focus transitions**: `duration-100` with `ease-in-out`
- **Card movements**: `duration-300` with `ease-out`
- **Page transitions**: `duration-500` with `ease-in-out`
- **Bounce animations**: `duration-700` with `ease-back`

## Component Specifications

### Buttons

#### Primary Button
```css
.button-primary {
  background-color: var(--primary-600);
  color: var(--white);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-150) var(--ease-out);
}

.button-primary:hover {
  background-color: var(--primary-700);
  box-shadow: var(--shadow-md);
}
```

#### Button Sizes
- **Small**: `height: 32px`, `padding: 8px 12px`, `font-size: 14px`
- **Medium**: `height: 40px`, `padding: 12px 16px`, `font-size: 16px`
- **Large**: `height: 48px`, `padding: 16px 24px`, `font-size: 18px`

### Cards

#### Standard Card
```css
.card {
  background-color: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-200) var(--ease-out);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

#### Game Card Specifications
- **Dimensions**: 200px × 280px (aspect ratio 5:7)
- **Border radius**: `radius-xl` (12px)
- **Shadow**: `shadow-lg` when elevated
- **Animation**: Smooth 3D flip transforms

### Forms

#### Input Fields
```css
.input {
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  background-color: var(--white);
  transition: all var(--duration-150) var(--ease-out);
}

.input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
```

## Accessibility Standards

### Focus Indicators
- **Outline**: 2px solid `primary-500` with 2px offset
- **Box shadow**: Alternative for elements that can't use outline
- **Visible on all interactive elements**: Never remove focus indicators

### Color Contrast Requirements
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio (18px+ or 14px+ bold)
- **Interactive elements**: Minimum 3:1 contrast for boundaries

### Touch Targets
- **Minimum size**: 44px × 44px for all interactive elements
- **Spacing**: Minimum 8px between adjacent touch targets
- **Visual feedback**: Clear visual response to touch interactions

## Usage Guidelines

### Do's
- ✅ Use design tokens consistently across components
- ✅ Maintain visual hierarchy through typography and spacing
- ✅ Provide clear interactive feedback for all user actions
- ✅ Test color combinations for accessibility compliance
- ✅ Follow established patterns for similar interactions

### Don'ts
- ❌ Use hardcoded colors or spacing values
- ❌ Create one-off component styles without design system basis
- ❌ Ignore accessibility requirements for any user interface element
- ❌ Use colors as the sole method of conveying information
- ❌ Create inconsistent interaction patterns

---

*This style guide should be referenced during all design and development work to ensure consistency and quality.*
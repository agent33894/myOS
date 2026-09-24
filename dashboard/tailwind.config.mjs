/**
 * Tailwind is a thin map onto src/styles/tokens.css. Utilities read like the
 * design language: `bg-raised text-text-secondary border-border rounded-md
 * shadow-overlay`. No raw values live here.
 */

/** A token color that also supports opacity modifiers (`bg-text/5`). */
const token = (name) => ({ opacityValue }) =>
  opacityValue === undefined || opacityValue === '1'
    ? `var(--${name})`
    : `color-mix(in oklch, var(--${name}) calc(${opacityValue} * 100%), transparent)`;

const size = (name) => [`var(--text-${name})`, { lineHeight: `var(--leading-${name})` }];

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Opacity is expressed through color-mix in `token()`, not --tw-*-opacity.
  corePlugins: {
    backgroundOpacity: false,
    textOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    placeholderOpacity: false,
    ringOpacity: false,
    // Elevation is a token; shadow-color utilities would collide with shadow-raised/overlay.
    boxShadowColor: false,
  },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#ffffff',
      black: '#000000',
      canvas: token('canvas'),
      sidebar: token('sidebar'),
      raised: token('raised'),
      overlay: token('overlay'),
      sunken: token('sunken'),
      text: {
        DEFAULT: token('text'),
        secondary: token('text-secondary'),
        tertiary: token('text-tertiary'),
      },
      border: { DEFAULT: token('border'), strong: token('border-strong') },
      accent: {
        DEFAULT: token('accent'),
        hover: token('accent-hover'),
        soft: token('accent-soft'),
        text: token('accent-text'),
        on: token('on-accent'),
      },
      success: { DEFAULT: token('success'), soft: token('success-soft') },
      warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
      danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
      focus: token('focus'),
      scrim: token('scrim'),
    },
    fontFamily: {
      sans: 'var(--font-sans)',
      serif: 'var(--font-serif)',
      mono: 'var(--font-mono)',
      reading: 'var(--font-reading)',
    },
    fontSize: {
      xs: size('xs'),
      sm: size('sm'),
      base: size('base'),
      md: size('md'),
      lg: [`var(--text-lg)`, { lineHeight: 'var(--leading-lg)', letterSpacing: '-0.01em' }],
      xl: [`var(--text-xl)`, { lineHeight: 'var(--leading-xl)', letterSpacing: '-0.015em' }],
      '2xl': [`var(--text-2xl)`, { lineHeight: 'var(--leading-2xl)', letterSpacing: '-0.02em' }],
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      full: '9999px',
      DEFAULT: 'var(--radius-sm)',
    },
    boxShadow: {
      none: 'none',
      raised: 'var(--shadow-raised)',
      overlay: 'var(--shadow-overlay)',
      dialog: 'var(--shadow-dialog)',
    },
    zIndex: {
      auto: 'auto',
      0: '0',
      10: '10',
      20: '20',
      sticky: 'var(--z-sticky)',
      dialog: 'var(--z-dialog)',
      popover: 'var(--z-popover)',
      toast: 'var(--z-toast)',
    },
    extend: {
      spacing: { 4.5: '1.125rem' }, // 18px: the task checkbox
      minWidth: { trigger: 'var(--radix-select-trigger-width)' },
      borderWidth: { DEFAULT: '1px', 1.5: '1.5px' },
      backdropBlur: { scrim: '2px' },
      ringColor: { DEFAULT: 'var(--focus)' },
      ringOffsetColor: { DEFAULT: 'var(--canvas)' },
      transitionDuration: {
        DEFAULT: 'var(--dur-fast)',
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease-out)',
        out: 'var(--ease-out)',
        spring: 'var(--ease-spring)',
      },
      // Keyframes live in src/styles/motion.css.
      animation: {
        'fade-out': 'fade-out var(--dur-fast) var(--ease-out)',
        'fade-in': 'fade-in var(--dur-base) var(--ease-out)',
        // Loading placeholders: invisible for 300ms so fast loads never flash.
        'fade-in-delayed': 'fade-in var(--dur-base) var(--ease-out) 300ms both',
        'scale-in': 'scale-in var(--dur-base) var(--ease-out)',
        'dialog-in': 'scale-in var(--dur-slow) var(--ease-out)',
        'slide-up': 'slide-up var(--dur-base) var(--ease-out)',
        'check-pop': 'check-pop var(--dur-slow) var(--ease-spring)',
      },
    },
  },
  plugins: [
    ({ addUtilities }) =>
      addUtilities({
        '.field-sizing-content': { 'field-sizing': 'content' },
        // Reserve the scrollbar's room on both sides so a centered column never shifts when content starts to scroll.
        '.scrollbar-stable': { 'scrollbar-gutter': 'stable both-edges' },
      }),
  ],
};

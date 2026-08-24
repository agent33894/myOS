/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        ed: {
          success: 'hsl(var(--ed-success))',
          warning: 'hsl(var(--ed-warning))',
          error: 'hsl(var(--ed-error))',
          info: 'hsl(var(--ed-info))',
        },
      },
      borderRadius: {
        sm: 'var(--radius-chip)',
        DEFAULT: 'var(--radius-chip)',
        md: 'var(--radius-control)',
        lg: 'var(--radius-control)',
        xl: 'var(--radius-overlay)',
        '2xl': 'var(--radius-overlay)',
        '3xl': 'var(--radius-overlay)',
      },
      boxShadow: {
        'chronicle-lifted': 'var(--shadow-lifted)',
        'chronicle-overlay': 'var(--shadow-overlay)',
      },
      spacing: { 18: '4.5rem', 22: '5.5rem', 26: '6.5rem' },
      scale: { 102: '1.02', 95: '0.95' },
      backdropBlur: { xs: '2px' },
      fontFamily: {
        mono: ['GeistMono-Variable', 'ui-monospace', 'SF Mono', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      // Hairline borders by default: DS2 separates with rules, not boxes.
      // Retina renders true 0.5px; non-retina rounds up to 1.
      borderWidth: {
        DEFAULT: '0.5px',
      },
      fontSize: {
        // Remap Tailwind's stock sizes onto the Chronicle ramp
        // (28 / 21 / 16 / 13 / 11 / 10) so legacy text-xs/text-sm usages
        // land on-ramp instead of 12/14px.
        xs: ['0.6875rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.125rem' }],
        '4xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};

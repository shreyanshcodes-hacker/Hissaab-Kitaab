/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-dim': 'var(--color-surface-dim)',
        'surface-bright': 'var(--color-surface-bright)',
        'surface-container-lowest': 'var(--color-surface-container-lowest)',
        'surface-container-low': 'var(--color-surface-container-low)',
        'surface-container': 'var(--color-surface-container)',
        'surface-container-high': 'var(--color-surface-container-high)',
        'surface-container-highest': 'var(--color-surface-container-highest)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-variant': 'var(--color-on-surface-variant)',
        'inverse-surface': 'var(--color-inverse-surface)',
        'inverse-on-surface': 'var(--color-inverse-on-surface)',
        outline: 'var(--color-outline)',
        'outline-variant': 'var(--color-outline-variant)',
        'surface-tint': '#316951',

        // Brand & Primary
        primary: {
          DEFAULT: '#04442f',
          container: '#245c45',
          'on-container': '#ffffff',
          hover: '#1b4735',
          fixed: '#b5efd1',
          'fixed-dim': '#99d3b6',
          'on-fixed': '#002114',
          'on-fixed-variant': '#16503a',
          dark: '#388465',
        },
        'on-primary': '#ffffff',
        'on-primary-container': '#ffffff',
        'on-primary-fixed': '#002114',
        'on-primary-fixed-variant': '#16503a',
        'inverse-primary': '#99d3b6',

        // Secondary (Muted & Badges)
        secondary: {
          DEFAULT: '#57615b',
          container: '#dbe5dd',
          'on-container': '#151d19',
          fixed: '#dbe5dd',
          'fixed-dim': '#bfc9c1',
          'on-fixed': '#151d19',
          'on-fixed-variant': '#404943',
        },
        'on-secondary': '#ffffff',
        'on-secondary-container': '#151d19',
        'on-secondary-fixed': '#151d19',
        'on-secondary-fixed-variant': '#404943',

        // Tertiary / Warning / Low Confidence ("Needs Checking")
        tertiary: {
          DEFAULT: '#d97706',
          container: '#7f4300',
          'on-container': '#ffffff',
          fixed: '#fef3c7',
          'fixed-dim': '#fcd34d',
          'on-fixed': '#92400e',
          'on-fixed-variant': '#b45309',
        },
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#ffffff',
        'on-tertiary-fixed': '#92400e',
        'on-tertiary-fixed-variant': '#b45309',

        // Error & Discrepancy
        error: {
          DEFAULT: '#dc2626',
          container: '#fee2e2',
          'on-container': '#991b1b',
        },
        'on-error': '#ffffff',
        'on-error-container': '#991b1b',

        // Verified / Success
        verified: {
          DEFAULT: '#15803d',
          container: '#dcfce7',
          'on-container': '#166534',
          border: '#86efac',
        },
        'on-verified': '#ffffff',
        'on-verified-container': '#166534',

        // Canvas
        background: 'var(--color-background)',
        'on-background': 'var(--color-on-background)',
        'surface-variant': 'var(--color-surface-variant)',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      spacing: {
        gutter: '1rem',
        'gutter-desktop': '1.5rem',
        margin: '1rem',
        'margin-desktop': '2rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.25rem',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-mobile': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-lg': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-sm': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'currency-stat': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'label-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'label-xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(37, 41, 35, 0.06)',
        elevated: '0 4px 12px rgba(37, 41, 35, 0.08)',
        modal: '0 12px 32px rgba(37, 41, 35, 0.16)',
        soft: '0 1px 8px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

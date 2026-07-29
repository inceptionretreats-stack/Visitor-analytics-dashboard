/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // semantic surfaces (also available as CSS vars in index.css)
        app: '#f6f8fb',
        surface: '#ffffff',
        subtle: '#f1f5f9',
        // brand / accents
        brand: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          soft: '#eef2ff',
        },
        blue2: '#2563eb',
        success: { DEFAULT: '#16a34a', soft: '#f0fdf4' },
        amber: { DEFAULT: '#d97706', soft: '#fffbeb' },
        rose: { DEFAULT: '#e11d48', soft: '#fff1f2' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        'card-hover': '0 6px 16px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.05)',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { transform: 'translateY(2000%)', opacity: '0' },
        },
      },
      animation: {
        scan: 'scan 3s linear infinite',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        accent: '#60A5FA',      // 🎨 BRAND: primary accent blue-400
        surface: '#F8FAFC',
        surface2: '#EFF6FF',    // blue-50
        muted: '#64748B',       // secondary text
      },
    },
  },
  plugins: [],
}

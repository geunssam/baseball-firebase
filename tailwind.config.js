/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'tablet': '768px',      // 태블릿 세로
        'tablet-lg': '1024px',  // 태블릿 가로 (13인치 기준)
        'desktop': '1280px',    // 데스크톱
      },
      fontSize: {
        // 태블릿에 최적화된 반응형 폰트 크기 (clamp 함수 활용)
        'responsive-xs': 'clamp(0.75rem, 1vw, 0.875rem)',
        'responsive-sm': 'clamp(0.875rem, 1.2vw, 1rem)',
        'responsive-base': 'clamp(1rem, 1.5vw, 1.125rem)',
        'responsive-lg': 'clamp(1.125rem, 2vw, 1.25rem)',
        'responsive-xl': 'clamp(1.25rem, 2.5vw, 1.5rem)',
        'responsive-2xl': 'clamp(1.5rem, 3vw, 2rem)',
      },
    },
  },
  plugins: [],
}

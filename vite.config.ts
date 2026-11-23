import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Салыстырмалы жолдар: жинақ кез келген хостингте (Netlify, Vercel, GitHub Pages ішкі бумасы) өзгеріссіз ашылады
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // three.js өзі үлкен кітапхана — ескерту шегін соған сай көтереміз
    chunkSizeWarningLimit: 1400,
  },
})

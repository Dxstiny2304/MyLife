import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' — сайт работает из любой папки (GitHub Pages отдаёт его по /MyLife/)
export default defineConfig({
  base: './',
  plugins: [react()],
})

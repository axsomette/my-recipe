import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages sert le site sous /<nom du dépôt>/.
export default defineConfig({
  base: '/my-recipe/',
  plugins: [preact(), tailwindcss()],
});

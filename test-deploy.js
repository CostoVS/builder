const AdmZip = require('adm-zip');
const fs = require('fs');

// Create test vite app
const zip = new AdmZip();
zip.addFile('index.html', Buffer.from(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`));
zip.addFile('package.json', Buffer.from(`{
  "name": "test-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.2.0"
  }
}`));
zip.addFile('vite.config.ts', Buffer.from(`import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`));
zip.addFile('src/main.tsx', Buffer.from(`import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <h1 id="testing-header">HELLO WORLD IT WORKED!</h1>
  </React.StrictMode>,
)`));

zip.writeZip('test.zip');

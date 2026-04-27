const AdmZip = require('adm-zip');
const fs = require('fs');

const zip = new AdmZip();
zip.addFile('package.json', Buffer.from(JSON.stringify({
  name: "ai-studio-app",
  scripts: { build: "vite build" },
  devDependencies: { vite: "*", "@vitejs/plugin-react": "*" },
  dependencies: { react: "*", "react-dom": "*", "react-router-dom": "*", "wouter": "*" }
})));
zip.addFile('vite.config.ts', Buffer.from(`import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()] });`));
zip.addFile('index.html', Buffer.from(`<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>`));
zip.addFile('src/main.tsx', Buffer.from(`
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Route, Switch } from 'wouter';

function App() { return <h1>Hello from App!</h1>; }

ReactDOM.createRoot(document.getElementById('root')).render(
  <Switch>
    <Route path="/" component={App} />
  </Switch>
);
`));
zip.writeZip('test-ai.zip');

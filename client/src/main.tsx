import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Debug: Add error catching to see what's failing
try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback: show basic HTML if React fails
  const root = document.getElementById('root')!;
  root.innerHTML = `
    <div style="padding: 20px; color: white; font-family: Arial;">
      <h1>App failed to load</h1>
      <p>Error: ${error}</p>
      <p>Check the browser console for more details.</p>
    </div>
  `;
}

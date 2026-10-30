import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { loadFonts } from '@/app/fonts'
import { enableMocking } from '@/app/mocks'

import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

// The first paint waits for the mock network and (briefly) the typeface, in parallel
await Promise.all([enableMocking(), loadFonts()])
// Imported only now: loading the app module creates the services, which open the socket and
// validate the session right away, and those requests must already be intercepted by MSW
const { App } = await import('@/app/app')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

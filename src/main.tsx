import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { enableMocking } from '@/app/mocks'

import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

await enableMocking()
// Imported only now: loading the app module creates the services, which open the socket and
// validate the session right away, and those requests must already be intercepted by MSW
const { App } = await import('@/app/app')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

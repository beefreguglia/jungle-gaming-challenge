import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/app'
import { enableMocking } from '@/app/mocks'

import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

await enableMocking()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

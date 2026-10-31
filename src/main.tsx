import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { loadFonts } from '@/app/fonts'
import { enableMocking } from '@/app/mocks'

import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

// The app bundle, the mock network and (briefly) the typeface load in parallel. Importing
// the app has no side effects; createApp() runs only once MSW intercepts requests, because
// the services open the socket and validate the session right away
const [{ createApp }] = await Promise.all([import('@/app/app'), enableMocking(), loadFonts()])
const App = createApp()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

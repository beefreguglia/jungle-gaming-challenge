import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

// Placeholder layout; header and footer follow the Figma once the design tokens land
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b">
        <nav aria-label="Principal" className="mx-auto flex max-w-7xl items-center px-4 py-4">
          <Link to="/" className="font-heading text-lg font-semibold">
            NFT Marketplace
          </Link>
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted-foreground">
          NFT Marketplace
        </div>
      </footer>
    </div>
  )
}

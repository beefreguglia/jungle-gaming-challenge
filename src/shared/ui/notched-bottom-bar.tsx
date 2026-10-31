import { Children, type ReactNode, useLayoutEffect, useRef, useState } from 'react'

import { type NotchedBarGeometry, notchedBarPath } from '@/shared/lib/notched-bar-path'
import { cn } from '@/shared/lib/utils'

// Geometry in px. The floating action is 60 px wide; the notch leaves 10 px around it and
// its center sits 4 px under the top edge, so the button rises 26 px above the bar
const BAR: Omit<NotchedBarGeometry, 'width'> = {
  height: 72,
  cornerRadius: 28,
  notchRadius: 40,
  notchCenterY: 4,
  filletRadius: 14,
}

interface NotchedBottomBarProps {
  // Accessible name of the navigation landmark
  label: string
  // Items on each side of the floating action (two each in the app's bar)
  start: ReactNode[]
  end: ReactNode[]
  // The raised circular action; sized and placed by the bar
  action: ReactNode
  className?: string
}

/**
 * Fixed bottom navigation drawn as one SVG outline: rounded top corners and a concave notch
 * that wraps the raised center action. The outline is recomputed for the rendered width,
 * so the notch keeps its size and depth on every screen instead of stretching.
 */
export function NotchedBottomBar({ label, start, end, action, className }: NotchedBottomBarProps) {
  const navRef = useRef<HTMLElement>(null)
  // The bar spans the viewport, so its width is known before the first measurement
  const [width, setWidth] = useState(() => document.documentElement.clientWidth)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setWidth(entry.contentRect.width)
    })
    observer.observe(nav)
    return () => observer.disconnect()
  }, [])

  const item = (node: ReactNode) => <li className="grid place-items-center">{node}</li>

  return (
    <nav ref={navRef} aria-label={label} className={cn('fixed inset-x-0 bottom-0 z-40', className)}>
      <svg
        aria-hidden="true"
        width={width}
        height={BAR.height}
        viewBox={`0 0 ${width} ${BAR.height}`}
        className="absolute inset-x-0 top-0 overflow-visible drop-shadow-[0_-6px_18px_rgb(0_0_0/0.35)]"
      >
        <path d={notchedBarPath({ width, ...BAR })} className="fill-card" />
      </svg>
      <ul className="relative mx-auto grid h-18 max-w-md grid-cols-[1fr_1fr_7rem_1fr_1fr] items-center px-2">
        {Children.map(start, item)}
        <li className="relative self-stretch">
          <div className="absolute -top-6.5 left-1/2 size-15 -translate-x-1/2">{action}</div>
        </li>
        {Children.map(end, item)}
      </ul>
      {/* Home indicator area of notched phones, in the bar color */}
      <div className="h-[env(safe-area-inset-bottom)] bg-card" />
    </nav>
  )
}

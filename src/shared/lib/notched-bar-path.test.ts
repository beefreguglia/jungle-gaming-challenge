import { describe, expect, it } from 'vitest'

import { type NotchedBarGeometry, notchedBarPath } from './notched-bar-path'

const geometry: NotchedBarGeometry = {
  width: 390,
  height: 72,
  cornerRadius: 28,
  notchRadius: 36,
  notchCenterY: 4,
  filletRadius: 14,
}

type Point = [number, number]

/** Curve segments of the path as [start, control 1, control 2, end]. */
function curves(d: string): Point[][] {
  const result: Point[][] = []
  let current: Point = [0, 0]
  for (const [, command, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const points = [...(args ?? '').matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(
      ([, x, y]) => [Number(x), Number(y)] as Point,
    )
    if (command === 'C') result.push([current, ...points])
    if (points.length > 0) current = points.at(-1)!
  }
  return result
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.05

describe('notchedBarPath', () => {
  const d = notchedBarPath(geometry)
  const segments = curves(d)

  it('starts and ends on the bottom edge, spanning the whole width', () => {
    expect(d.startsWith('M0,72 L0,28')).toBe(true)
    expect(d.endsWith('L390,72 Z')).toBe(true)
  })

  it('is symmetric around the center', () => {
    const points = segments.flat()
    const hasPoint = (x: number, y: number) => points.some(([px, py]) => near(px, x) && near(py, y))
    for (const [x, y] of points) expect(hasPoint(390 - x, y)).toBe(true)
  })

  it('cuts the notch down to the bottom of the circle around the button', () => {
    const lowest = Math.max(...segments.flat().map(([, y]) => y))
    expect(lowest).toBeCloseTo(4 + 36, 1)
    expect(segments.flat().some(([x, y]) => near(x, 195) && near(y, 40))).toBe(true)
  })

  it('joins every curve to the next without a corner', () => {
    // Between consecutive curves, the incoming and outgoing tangents point the same way
    for (let index = 0; index + 1 < segments.length; index++) {
      const [, , inControl, joint] = segments[index]!
      const [start, outControl] = segments[index + 1]!
      if (!near(joint![0], start![0]) || !near(joint![1], start![1])) continue // a line between
      const incoming = [joint![0] - inControl![0], joint![1] - inControl![1]]
      const outgoing = [outControl![0] - start![0], outControl![1] - start![1]]
      const cross = incoming[0]! * outgoing[1]! - incoming[1]! * outgoing[0]!
      const dot = incoming[0]! * outgoing[0]! + incoming[1]! * outgoing[1]!
      expect(Math.abs(cross)).toBeLessThan(0.5)
      expect(dot).toBeGreaterThan(0)
    }
  })

  it('keeps the notch the same size at any width', () => {
    // Points below the top edge, away from the corners, belong to the notch
    const notchWidth = (width: number) => {
      const xs = curves(notchedBarPath({ ...geometry, width }))
        .flat()
        .filter(([x, y]) => y > 0.05 && x > 28 && x < width - 28)
        .map(([x]) => x)
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(notchWidth(320)).toBeCloseTo(notchWidth(430), 1)
  })
})
